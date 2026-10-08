-- ============================================================
-- money task — esquema do banco (Supabase / PostgreSQL)
-- Cole tudo no SQL Editor do Supabase e clique em Run.
-- Pode rodar de novo sem erro (usa "if not exists" / "or replace").
-- ============================================================

-- ---------- 1. PERFIS (pais e filhos) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('parent','child')),
  full_name   text not null,
  username    text unique,                       -- só filhos
  age         smallint check (age between 7 and 18),  -- só filhos
  parent_id   uuid references public.profiles(id) on delete cascade, -- só filhos
  consent_at  timestamptz,                       -- LGPD: consentimento do responsável
  created_at  timestamptz not null default now(),
  constraint child_fields check (
    (role = 'parent' and parent_id is null and username is null and age is null)
    or
    (role = 'child' and parent_id is not null and username is not null and age is not null)
  )
);
create index if not exists profiles_parent_idx on public.profiles(parent_id);

-- ---------- 2. TAREFAS ----------
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  parent_id     uuid not null references public.profiles(id) on delete cascade,
  child_id      uuid not null references public.profiles(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 80),
  description   text check (char_length(description) <= 300),
  xp            integer not null check (xp between 1 and 5000),
  recurrence    text not null default 'once' check (recurrence in ('once','daily','weekly')),
  require_photo boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists tasks_child_idx on public.tasks(child_id);

create table if not exists public.task_submissions (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.tasks(id) on delete cascade,
  child_id      uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  note          text check (char_length(note) <= 300),
  photo_path    text,
  reject_reason text check (char_length(reject_reason) <= 300),
  xp_awarded    integer,
  submitted_at  timestamptz not null default now(),
  reviewed_at   timestamptz
);
create index if not exists subs_task_idx  on public.task_submissions(task_id);
create index if not exists subs_child_idx on public.task_submissions(child_id);

-- ---------- 3. RECOMPENSAS ----------
create table if not exists public.rewards (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references public.profiles(id) on delete cascade,
  child_id    uuid references public.profiles(id) on delete cascade, -- vazio = todos os filhos
  title       text not null check (char_length(title) between 1 and 80),
  description text check (char_length(description) <= 300),
  cost_xp     integer not null check (cost_xp between 1 and 50000),
  icon        text not null default 'gift',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.redemptions (
  id           uuid primary key default gen_random_uuid(),
  reward_id    uuid not null references public.rewards(id) on delete cascade,
  child_id     uuid not null references public.profiles(id) on delete cascade,
  cost_xp      integer not null,
  status       text not null default 'pending' check (status in ('pending','delivered')),
  created_at   timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists redemptions_child_idx on public.redemptions(child_id);

-- ---------- 4. EXTRATO DE XP (única fonte do saldo) ----------
create table if not exists public.xp_ledger (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.profiles(id) on delete cascade,
  delta       integer not null check (delta <> 0),
  kind        text not null check (kind in ('task','redeem','quiz','bonus')),
  ref_id      uuid,
  description text not null,
  created_at  timestamptz not null default now()
);
create index if not exists ledger_child_idx on public.xp_ledger(child_id, created_at desc);

-- ---------- 5. EDUCAÇÃO FINANCEIRA ----------
create table if not exists public.edu_modules (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  position   smallint not null,
  title      text not null,
  summary    text,
  min_age    smallint not null default 16,
  xp_reward  integer not null default 100
);
create table if not exists public.edu_lessons (
  id         uuid primary key default gen_random_uuid(),
  module_id  uuid not null references public.edu_modules(id) on delete cascade,
  position   smallint not null,
  title      text not null,
  body       text not null,
  source     text,
  unique (module_id, position)
);
create table if not exists public.edu_questions (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references public.edu_modules(id) on delete cascade,
  position    smallint not null,
  prompt      text not null,
  options     jsonb not null,          -- ["texto A","texto B","texto C","texto D"]
  explanation text,
  source      text,
  unique (module_id, position)
);
-- Gabarito separado: ninguém lê direto; só a função submit_quiz consulta.
create table if not exists public.edu_answers (
  question_id   uuid primary key references public.edu_questions(id) on delete cascade,
  correct_index smallint not null check (correct_index between 0 and 3)
);
create table if not exists public.edu_attempts (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references public.profiles(id) on delete cascade,
  module_id  uuid not null references public.edu_modules(id) on delete cascade,
  score      smallint not null,
  total      smallint not null,
  passed     boolean not null,
  results    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists attempts_child_idx on public.edu_attempts(child_id, module_id);

-- ---------- 6. CONQUISTAS ----------
create table if not exists public.achievements (
  code        text primary key,
  title       text not null,
  description text not null,
  icon        text not null default 'trophy'
);
create table if not exists public.child_achievements (
  child_id    uuid not null references public.profiles(id) on delete cascade,
  code        text not null references public.achievements(code),
  unlocked_at timestamptz not null default now(),
  primary key (child_id, code)
);

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================
create or replace function public.is_my_child(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = c and parent_id = auth.uid());
$$;

create or replace function public.my_parent()
returns uuid language sql stable security definer set search_path = public as $$
  select parent_id from profiles where id = auth.uid();
$$;

-- Nível a partir do XP acumulado (nunca cai, mesmo gastando XP)
create or replace function public.level_for(lifetime integer)
returns integer language sql immutable as $$
  select case
    when lifetime < 250  then 1
    when lifetime < 750  then 2
    when lifetime < 1500 then 3
    when lifetime < 2500 then 4
    when lifetime < 4000 then 5
    else 6 end;
$$;

-- Cria o perfil do responsável quando ele se cadastra.
-- (O perfil do filho é criado pela função segura "create-child", não por aqui.)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email like '%@filho.moneytask.app' then
    return new;
  end if;
  insert into public.profiles (id, role, full_name, consent_at)
  values (new.id, 'parent',
          coalesce(nullif(new.raw_user_meta_data->>'full_name',''), 'Responsável'),
          case when (new.raw_user_meta_data->>'consent') = 'true' then now() end);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- VIEW: saldo, XP acumulado e nível de cada filho
-- ============================================================
create or replace view public.child_stats with (security_invoker = true) as
select p.id as child_id,
       coalesce(sum(l.delta), 0)::int                              as balance,
       coalesce(sum(l.delta) filter (where l.delta > 0), 0)::int   as lifetime,
       public.level_for(coalesce(sum(l.delta) filter (where l.delta > 0), 0)::int) as level
from public.profiles p
left join public.xp_ledger l on l.child_id = p.id
where p.role = 'child'
group by p.id;

-- ============================================================
-- AÇÕES DO APP (RPC) — toda regra importante roda aqui, no servidor
-- ============================================================

-- Filho envia uma tarefa para aprovação
create or replace function public.submit_task(p_task uuid, p_note text default null, p_photo text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare t tasks; v_id uuid; v_since timestamptz;
begin
  select * into t from tasks where id = p_task and child_id = auth.uid() and active;
  if not found then raise exception 'Tarefa não encontrada'; end if;
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

-- Responsável aprova → XP é creditado (uma única vez)
create or replace function public.approve_submission(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s task_submissions; t tasks;
begin
  select * into s from task_submissions where id = p_id for update;
  if not found then raise exception 'Envio não encontrado'; end if;
  select * into t from tasks where id = s.task_id;
  if t.parent_id <> auth.uid() then raise exception 'Sem permissão'; end if;
  if s.status <> 'pending' then raise exception 'Este envio já foi revisado'; end if;
  update task_submissions set status = 'approved', xp_awarded = t.xp, reviewed_at = now() where id = s.id;
  insert into xp_ledger (child_id, delta, kind, ref_id, description)
  values (s.child_id, t.xp, 'task', s.id, t.title);
end $$;

create or replace function public.reject_submission(p_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare s task_submissions; t tasks;
begin
  select * into s from task_submissions where id = p_id for update;
  if not found then raise exception 'Envio não encontrado'; end if;
  select * into t from tasks where id = s.task_id;
  if t.parent_id <> auth.uid() then raise exception 'Sem permissão'; end if;
  if s.status <> 'pending' then raise exception 'Este envio já foi revisado'; end if;
  update task_submissions set status = 'rejected', reject_reason = p_reason, reviewed_at = now() where id = s.id;
end $$;

-- Filho resgata uma recompensa (confere o saldo com segurança)
create or replace function public.redeem_reward(p_reward uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare r rewards; v_bal integer; v_id uuid;
begin
  perform 1 from profiles where id = auth.uid() and role = 'child' for update; -- evita dois resgates ao mesmo tempo
  if not found then raise exception 'Apenas filhos podem resgatar'; end if;
  select * into r from rewards
   where id = p_reward and active and parent_id = my_parent()
     and (child_id is null or child_id = auth.uid());
  if not found then raise exception 'Recompensa indisponível'; end if;
  select coalesce(sum(delta),0) into v_bal from xp_ledger where child_id = auth.uid();
  if v_bal < r.cost_xp then raise exception 'Saldo insuficiente: faltam % XP', r.cost_xp - v_bal; end if;
  insert into redemptions (reward_id, child_id, cost_xp) values (r.id, auth.uid(), r.cost_xp) returning id into v_id;
  insert into xp_ledger (child_id, delta, kind, ref_id, description)
  values (auth.uid(), -r.cost_xp, 'redeem', v_id, 'Resgate: ' || r.title);
  return v_id;
end $$;

create or replace function public.mark_redemption_delivered(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare rd redemptions;
begin
  select * into rd from redemptions where id = p_id for update;
  if not found or not exists (select 1 from rewards where id = rd.reward_id and parent_id = auth.uid()) then
    raise exception 'Sem permissão';
  end if;
  update redemptions set status = 'delivered', delivered_at = now() where id = p_id;
end $$;

-- Filho entrega a prova; a correção é feita aqui (o gabarito nunca vai para o app)
create or replace function public.submit_quiz(p_module uuid, p_answers int[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare m edu_modules; v_age smallint; q record; v_total int := 0; v_score int := 0;
        v_res jsonb := '[]'::jsonb; v_ok boolean; v_pct numeric; v_passed boolean; v_xp int := 0; i int := 0;
begin
  select age into v_age from profiles where id = auth.uid() and role = 'child';
  if v_age is null then raise exception 'Apenas filhos fazem provas'; end if;
  select * into m from edu_modules where id = p_module;
  if not found or v_age < m.min_age then raise exception 'Módulo indisponível'; end if;
  for q in select eq.id, ea.correct_index, eq.explanation
             from edu_questions eq join edu_answers ea on ea.question_id = eq.id
            where eq.module_id = p_module order by eq.position loop
    i := i + 1; v_total := v_total + 1;
    v_ok := (p_answers[i] is not null and p_answers[i] = q.correct_index);
    if v_ok then v_score := v_score + 1; end if;
    v_res := v_res || jsonb_build_object('question_id', q.id, 'correct', v_ok,
                                         'correct_index', q.correct_index, 'explanation', q.explanation);
  end loop;
  if v_total = 0 then raise exception 'Este módulo ainda não tem prova'; end if;
  v_pct := v_score::numeric / v_total * 100;
  v_passed := v_pct >= 70;
  if v_passed and not exists (select 1 from edu_attempts where child_id = auth.uid() and module_id = p_module and passed) then
    insert into xp_ledger (child_id, delta, kind, ref_id, description)
    values (auth.uid(), m.xp_reward, 'quiz', p_module, 'Prova: ' || m.title);
    v_xp := m.xp_reward;
  end if;
  insert into edu_attempts (child_id, module_id, score, total, passed, results)
  values (auth.uid(), p_module, v_score, v_total, v_passed, v_res);
  return jsonb_build_object('score', v_score, 'total', v_total, 'percent', round(v_pct),
                            'passed', v_passed, 'xp_awarded', v_xp, 'results', v_res);
end $$;

-- Só usuários logados chamam as funções do app
do $$ declare f text; begin
  foreach f in array array[
    'submit_task(uuid,text,text)','approve_submission(uuid)','reject_submission(uuid,text)',
    'redeem_reward(uuid)','mark_redemption_delivered(uuid)','submit_quiz(uuid,int[])'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ============================================================
-- SEGURANÇA (RLS): cada pessoa só enxerga o que é dela
-- ============================================================
alter table public.profiles           enable row level security;
alter table public.tasks              enable row level security;
alter table public.task_submissions   enable row level security;
alter table public.rewards            enable row level security;
alter table public.redemptions        enable row level security;
alter table public.xp_ledger          enable row level security;
alter table public.edu_modules        enable row level security;
alter table public.edu_lessons        enable row level security;
alter table public.edu_questions      enable row level security;
alter table public.edu_answers        enable row level security;   -- sem política = ninguém lê
alter table public.edu_attempts       enable row level security;
alter table public.achievements       enable row level security;
alter table public.child_achievements enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or parent_id = auth.uid());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() and role = 'parent') with check (id = auth.uid() and role = 'parent');
drop policy if exists profiles_update_child on public.profiles;
create policy profiles_update_child on public.profiles for update to authenticated
  using (parent_id = auth.uid()) with check (parent_id = auth.uid() and role = 'child');
drop policy if exists profiles_delete_child on public.profiles;
create policy profiles_delete_child on public.profiles for delete to authenticated
  using (parent_id = auth.uid());

-- tasks
drop policy if exists tasks_parent_all on public.tasks;
create policy tasks_parent_all on public.tasks for all to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid() and public.is_my_child(child_id));
drop policy if exists tasks_child_select on public.tasks;
create policy tasks_child_select on public.tasks for select to authenticated
  using (child_id = auth.uid() and active);

-- task_submissions (só leitura direta; escrita pelas funções)
drop policy if exists subs_select on public.task_submissions;
create policy subs_select on public.task_submissions for select to authenticated
  using (child_id = auth.uid() or public.is_my_child(child_id));

-- rewards
drop policy if exists rewards_parent_all on public.rewards;
create policy rewards_parent_all on public.rewards for all to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid() and (child_id is null or public.is_my_child(child_id)));
drop policy if exists rewards_child_select on public.rewards;
create policy rewards_child_select on public.rewards for select to authenticated
  using (active and parent_id = public.my_parent() and (child_id is null or child_id = auth.uid()));

-- redemptions e xp_ledger (só leitura)
drop policy if exists redemptions_select on public.redemptions;
create policy redemptions_select on public.redemptions for select to authenticated
  using (child_id = auth.uid() or public.is_my_child(child_id));
drop policy if exists ledger_select on public.xp_ledger;
create policy ledger_select on public.xp_ledger for select to authenticated
  using (child_id = auth.uid() or public.is_my_child(child_id));

-- conteúdo educacional: leitura para logados (gabarito fica fechado)
drop policy if exists edu_modules_read on public.edu_modules;
create policy edu_modules_read on public.edu_modules for select to authenticated using (true);
drop policy if exists edu_lessons_read on public.edu_lessons;
create policy edu_lessons_read on public.edu_lessons for select to authenticated using (true);
drop policy if exists edu_questions_read on public.edu_questions;
create policy edu_questions_read on public.edu_questions for select to authenticated using (true);
drop policy if exists edu_attempts_select on public.edu_attempts;
create policy edu_attempts_select on public.edu_attempts for select to authenticated
  using (child_id = auth.uid() or public.is_my_child(child_id));
drop policy if exists achievements_read on public.achievements;
create policy achievements_read on public.achievements for select to authenticated using (true);
drop policy if exists child_ach_select on public.child_achievements;
create policy child_ach_select on public.child_achievements for select to authenticated
  using (child_id = auth.uid() or public.is_my_child(child_id));

-- ============================================================
-- FOTOS DAS TAREFAS (armazenamento privado)
-- Caminho do arquivo: {id_do_filho}/{nome}.jpg
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-photos', 'task-photos', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists photos_child_insert on storage.objects;
create policy photos_child_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'task-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists photos_select on storage.objects;
create policy photos_select on storage.objects for select to authenticated
  using (bucket_id = 'task-photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_my_child(((storage.foldername(name))[1])::uuid)));

-- ============================================================
-- DADOS INICIAIS
-- ============================================================
insert into public.edu_modules (slug, position, title, summary, min_age, xp_reward) values
 ('dinheiro-orcamento', 1, 'Dinheiro, renda e orçamento pessoal',     'De onde vem o dinheiro e como organizar seus gastos.', 16, 100),
 ('cartoes',            2, 'Cartão de débito e de crédito',            'Como funcionam e quando usar cada um.',                16, 100),
 ('juros-dividas',      3, 'Empréstimos, juros e endividamento',       'O custo do dinheiro no tempo e como evitar dívidas.',  16, 100),
 ('investimentos',      4, 'Investimentos básicos',                    'Poupança, renda fixa e Tesouro Direto.',               16, 100),
 ('impostos',           5, 'Impostos e cidadania fiscal',              'Para onde vai o imposto e seus direitos.',             16, 100),
 ('golpes-cripto',      6, 'Criptoativos, riscos e golpes',            'Como se proteger de fraudes e promessas fáceis.',      16, 100)
on conflict (slug) do nothing;

insert into public.achievements (code, title, description, icon) values
 ('first_task',   'Primeira tarefa',    'Concluiu sua primeira tarefa.',        'check'),
 ('streak_3',     '3 dias seguidos',    'Manteve a sequência por 3 dias.',      'flame'),
 ('streak_7',     '7 dias seguidos',    'Manteve a sequência por 7 dias.',      'flame'),
 ('first_redeem', 'Primeiro resgate',   'Trocou XP por uma recompensa.',        'gift'),
 ('xp_500',       'Meta de 500 XP',     'Acumulou 500 XP ao todo.',             'trophy'),
 ('study_master', 'Mestre dos estudos', 'Concluiu 5 tarefas de estudo.',        'book')
on conflict (code) do nothing;
