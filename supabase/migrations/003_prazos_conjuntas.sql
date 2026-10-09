-- ============================================================
-- 003 · Prazo e perda de XP nas tarefas, prazo nas recompensas,
--       tarefas conjuntas e tarefa de boas-vindas.
-- Pode ser executada mais de uma vez sem problema.
-- ============================================================

-- ---------- colunas novas ----------
alter table public.tasks   add column if not exists due_at     timestamptz;
alter table public.tasks   add column if not exists penalty_xp integer not null default 0;
alter table public.tasks   add column if not exists group_id   uuid;
alter table public.rewards add column if not exists expires_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_penalty_range') then
    alter table public.tasks add constraint tasks_penalty_range check (penalty_xp between 0 and 5000);
  end if;
end $$;

-- extrato passa a aceitar descontos por prazo perdido
alter table public.xp_ledger drop constraint if exists xp_ledger_kind_check;
alter table public.xp_ledger add constraint xp_ledger_kind_check check (kind in ('task','redeem','quiz','bonus','penalty'));

-- ---------- descontos já aplicados (um por tarefa e membro) ----------
create table if not exists public.task_penalties (
  task_id    uuid not null references public.tasks(id) on delete cascade,
  child_id   uuid not null references public.profiles(id) on delete cascade,
  xp_removed integer not null default 0,
  applied_at timestamptz not null default now(),
  primary key (task_id, child_id)
);
alter table public.task_penalties enable row level security;
drop policy if exists task_penalties_select on public.task_penalties;
create policy task_penalties_select on public.task_penalties for select to authenticated
  using (child_id = auth.uid() or exists (select 1 from public.profiles c where c.id = child_id and c.parent_id = auth.uid()));

-- ---------- enviar tarefa: respeita o prazo ----------
create or replace function public.submit_task(p_task uuid, p_note text default null, p_photo text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare t tasks; v_id uuid; v_since timestamptz;
begin
  select * into t from tasks where id = p_task and child_id = auth.uid() and active;
  if not found then raise exception 'Tarefa não encontrada'; end if;
  if t.due_at is not null and now() > t.due_at then raise exception 'O prazo desta tarefa já passou'; end if;
  if t.require_photo and p_photo is null then raise exception 'Esta tarefa exige uma foto'; end if;
  if exists (select 1 from task_submissions where task_id = t.id and status = 'pending') then
    raise exception 'Esta tarefa já foi enviada e aguarda aprovação';
  end if;
  v_since := case t.recurrence
               when 'daily'  then date_trunc('day',  now())
               when 'weekly' then date_trunc('week', now())
               else '-infinity'::timestamptz end;
  if exists (select 1 from task_submissions
             where task_id = t.id and status = 'approved' and submitted_at >= v_since) then
    raise exception 'Você já concluiu esta tarefa neste período';
  end if;
  insert into task_submissions (task_id, child_id, note, photo_path)
  values (t.id, auth.uid(), p_note, p_photo) returning id into v_id;
  return v_id;
end $$;

-- ---------- resgate: respeita o prazo da recompensa ----------
create or replace function public.redeem_reward(p_reward uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare r rewards; v_bal integer; v_id uuid;
begin
  perform 1 from profiles where id = auth.uid() and role = 'child' for update;
  if not found then raise exception 'Apenas membros resgatam recompensas'; end if;
  select * into r from rewards
   where id = p_reward and active and parent_id = my_parent()
     and (child_id is null or child_id = auth.uid());
  if not found then raise exception 'Recompensa indisponível'; end if;
  if r.expires_at is not null and now() > r.expires_at then raise exception 'O prazo desta recompensa já acabou'; end if;
  select coalesce(sum(delta),0) into v_bal from xp_ledger where child_id = auth.uid();
  if v_bal < r.cost_xp then raise exception 'Saldo insuficiente: faltam % XP', r.cost_xp - v_bal; end if;
  insert into redemptions (reward_id, child_id, cost_xp) values (r.id, auth.uid(), r.cost_xp) returning id into v_id;
  insert into xp_ledger (child_id, delta, kind, ref_id, description)
  values (auth.uid(), -r.cost_xp, 'redeem', v_id, 'Resgate: ' || r.title);
  return v_id;
end $$;

-- ---------- perda de XP por prazo vencido (automática) ----------
-- Chamada pelo app (responsável ou membro). Só atua nas tarefas da própria família,
-- uma única vez por tarefa e membro, e nunca deixa o saldo negativo.
create or replace function public.apply_penalties()
returns integer language plpgsql security definer set search_path = public as $$
declare v_parent uuid; v_role text; t record; v_bal integer; v_cut integer; v_n integer := 0;
begin
  select role, coalesce(parent_id, id) into v_role, v_parent from profiles where id = auth.uid();
  if v_parent is null then return 0; end if;
  for t in
    select * from tasks
     where parent_id = v_parent and active and penalty_xp > 0 and due_at is not null and due_at < now()
       and (v_role = 'parent' or child_id = auth.uid())
       and not exists (select 1 from task_penalties p where p.task_id = tasks.id and p.child_id = tasks.child_id)
       and not exists (select 1 from task_submissions s where s.task_id = tasks.id and s.status in ('pending','approved'))
     for update skip locked
  loop
    select coalesce(sum(delta),0) into v_bal from xp_ledger where child_id = t.child_id;
    v_cut := greatest(0, least(t.penalty_xp, v_bal));
    insert into task_penalties (task_id, child_id, xp_removed) values (t.id, t.child_id, v_cut) on conflict do nothing;
    if v_cut > 0 then
      insert into xp_ledger (child_id, delta, kind, ref_id, description)
      values (t.child_id, -v_cut, 'penalty', t.id, 'Prazo perdido: ' || t.title);
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- ---------- tarefas conjuntas: quem do grupo já concluiu ----------
create or replace function public.joint_progress()
returns table (task_id uuid, group_id uuid, member_name text, is_me boolean, done boolean)
language sql stable security definer set search_path = public as $$
  select t.id, t.group_id, p.full_name, (t.child_id = auth.uid()),
         exists (select 1 from task_submissions s where s.task_id = t.id and s.status = 'approved')
    from tasks t
    join profiles p on p.id = t.child_id
   where t.group_id is not null and t.active
     and t.group_id in (select g.group_id from tasks g
                         where g.group_id is not null and g.active
                           and (g.child_id = auth.uid() or g.parent_id = auth.uid()));
$$;

do $$ declare f text; begin
  foreach f in array array['apply_penalties()','joint_progress()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------- tarefa de boas-vindas para todo novo membro ----------
create or replace function public.welcome_task()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'child' and new.parent_id is not null then
    insert into tasks (parent_id, child_id, title, description, xp, recurrence, require_photo)
    values (new.parent_id, new.id, 'Conheça o money task',
            'Navegue por todo o aplicativo: início, tarefas, loja, conquistas e perfil. Depois toque em Concluir.',
            50, 'once', false);
  end if;
  return new;
end $$;
drop trigger if exists profiles_welcome_task on public.profiles;
create trigger profiles_welcome_task after insert on public.profiles
  for each row execute function public.welcome_task();

-- membros que já existiam também recebem a tarefa (uma vez)
insert into public.tasks (parent_id, child_id, title, description, xp, recurrence, require_photo)
select p.parent_id, p.id, 'Conheça o money task',
       'Navegue por todo o aplicativo: início, tarefas, loja, conquistas e perfil. Depois toque em Concluir.',
       50, 'once', false
  from public.profiles p
 where p.role = 'child' and p.parent_id is not null
   and not exists (select 1 from public.tasks t where t.child_id = p.id and t.title = 'Conheça o money task');
