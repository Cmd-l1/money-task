import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { api, getSession } from '../../lib/api';
import { navigate, currentQuery } from '../../lib/router';
import { Alert, BottomNav, Button, Chip, DateTimeInput, Empty, Field, Loading, PasswordInput, Progress, Sheet, Switch, TextInput, TopBar, run, toast, useData, deadlineText, when, type NavItem } from '../../ui/kit';
import { Icon, REWARD_ICONS } from '../../ui/Icon';
import { InstallBanner } from '../kid/Kid';
import type { Child, Repeat } from '../../lib/types';

export function ParentLayout({ active, children }: { active: string; children: ReactNode }) {
  const items: NavItem[] = [
    { key: 'tarefas', label: 'Tarefas', icon: 'list', path: '/pai/tarefas' },
    { key: 'loja', label: 'Loja', icon: 'gift', path: '/pai/recompensas' },
    { key: 'inicio', label: 'Início', icon: 'home', path: '/pai' },
    { key: 'membros', label: 'Membros', icon: 'users', path: '/pai/membros' },
    { key: 'perfil', label: 'Perfil', icon: 'user', path: '/pai/perfil' },
  ];
  return (
    <>
      <div className="screen has-nav">{children}</div>
      <BottomNav items={items} active={active} />
    </>
  );
}

const Av = ({ c }: { c: Child }) => <div className="avatar">{c.name[0].toUpperCase()}</div>;
const repeatLabel = (r: Repeat) => (r === 'daily' ? 'Diária' : r === 'weekly' ? 'Semanal' : 'Uma vez');
const shortDate = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace(' de ', ' ').replace('.', '');
const plusBtn: CSSProperties = { background: 'var(--primary)', color: 'var(--primary-foreground)' };
const bareBtn: CSSProperties = { width: 36, height: 36, display: 'grid', placeItems: 'center', color: 'var(--muted-foreground)' };

/** Folha de confirmação de exclusão (tarefa, recompensa). */
function ConfirmSheet({ open, onClose, title, text, label, onConfirm }: { open: boolean; onClose: () => void; title: string; text: string; label: string; onConfirm: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="tile lg danger icon-top"><Icon name="trash" size={26} /></div>
      <h2 className="t-m" style={{ textAlign: 'center' }}>{title}</h2>
      <p className="muted t-cap" style={{ textAlign: 'center' }}>{text}</p>
      <Button variant="danger" icon="trash" onClick={onConfirm}>{label}</Button>
      <Button variant="outline" onClick={onClose}>Cancelar</Button>
    </Sheet>
  );
}

/** Modal "Nova senha" do filho (2 campos). */
function ResetPasswordSheet({ child, open, onClose }: { child?: Child; open: boolean; onClose: () => void }) {
  const [np, setNp] = useState('');
  const [np2, setNp2] = useState('');
  const [err, setErr] = useState('');
  const close = () => { setNp(''); setNp2(''); setErr(''); onClose(); };
  const save = async () => {
    if (np.length < 6) return setErr('Mínimo de 6 caracteres.');
    if (np !== np2) return setErr('As senhas não coincidem.');
    setErr('');
    if (child && (await run(() => api.resetChildPassword(child.id, np), 'Senha redefinida.'))) close();
  };
  return (
    <Sheet open={open} onClose={close}>
      <h2 className="t-m" style={{ textAlign: 'center' }}>Nova senha de {child?.name}</h2>
      <p className="muted t-cap" style={{ textAlign: 'center' }}>Ele precisará usar a nova senha no próximo acesso.</p>
      <Field label="Nova senha"><PasswordInput placeholder="Mínimo de 6 caracteres" value={np} onChange={(e) => setNp(e.target.value)} /></Field>
      <Field label="Confirmar senha" error={err}><PasswordInput placeholder="Repita a senha" value={np2} onChange={(e) => setNp2(e.target.value)} /></Field>
      <Button onClick={save}>Salvar nova senha</Button>
      <Button variant="outline" onClick={close}>Cancelar</Button>
    </Sheet>
  );
}

/** Modal "Remover membro". */
function RemoveMemberSheet({ child, open, onClose, onDone }: { child?: Child; open: boolean; onClose: () => void; onDone?: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="tile lg locked icon-top" style={{ color: 'var(--destructive)' }}><Icon name="alert" size={28} /></div>
      <h2 className="t-m" style={{ textAlign: 'center' }}>Remover {child?.name}?</h2>
      <p className="muted t-cap" style={{ textAlign: 'center' }}>O histórico de XP, tarefas e resgates dele será apagado e não poderá ser recuperado.</p>
      <Button variant="danger" icon="trash" onClick={async () => { if (child && (await run(() => api.removeChild(child.id), 'Membro removido.'))) { onClose(); onDone?.(); } }}>Remover membro</Button>
      <Button variant="outline" onClick={onClose}>Cancelar</Button>
    </Sheet>
  );
}

// ---------- início ----------
export function ParentHome() {
  const { data: kids } = useData(() => api.children());
  const { data: tasks } = useData(() => api.tasks());
  const { data: rewards } = useData(() => api.rewards());
  const { data: pend } = useData(() => api.submissions('pending'));
  if (!kids || !tasks || !rewards || !pend) return <ParentLayout active="inicio"><Loading /></ParentLayout>;
  const first = pend[0];
  return (
    <ParentLayout active="inicio">
      <div className="row between">
        <div className="col" style={{ gap: 0 }}>
          <h1 className="t-l">Olá, responsável!</h1>
          <span className="muted t-cap">{kids.length === 0 ? 'Crie a jornada de aprendizado dos seus filhos' : 'Resumo da sua família hoje'}</span>
        </div>
        <button className="back" onClick={() => navigate('/pai/aprovacoes')} aria-label="Aprovações pendentes">
          <Icon name="bell" size={20} />
        </button>
      </div>

      {first ? (
        <button className="alert warning" style={{ textAlign: 'left', width: '100%' }} onClick={() => navigate('/pai/aprovacoes')}>
          <span className="tile" style={{ background: 'var(--warning)' }}><Icon name="clock" size={22} /></span>
          <span className="alert-body">
            <span className="alert-title" style={{ fontSize: 15, fontWeight: 700 }}>{pend.length === 1 ? '1 tarefa para aprovar' : `${pend.length} tarefas para aprovar`}</span>
            <span className="alert-desc">{first.child?.name} enviou "{first.task?.title}"</span>
          </span>
          <Icon name="chevron" size={20} />
        </button>
      ) : kids.length > 0 ? (
        <Alert icon="check" title="Tudo em dia">Nenhuma tarefa aguardando sua aprovação.</Alert>
      ) : null}

      <div className="stats">
        <div className="card stat"><b>{kids.length}</b><span>Membros</span></div>
        <div className="card stat"><b>{tasks.length}</b><span>Tarefas</span></div>
        <div className="card stat"><b>{rewards.length}</b><span>Recompensas</span></div>
      </div>

      {kids.length === 0 ? (
        <Empty icon="users" title="Nenhum membro no momento" text="Adicione seu primeiro filho para começar a criar tarefas e recompensas." action={<Button icon="plus" onClick={() => navigate('/pai/membros/novo')}>Adicionar membro</Button>} />
      ) : (
        <>
          <h2 className="t-h">Membros</h2>
          {kids.map((c) => (
            <button key={c.id} className="card clickable row" style={{ textAlign: 'left', width: '100%', padding: '12px 14px' }} onClick={() => navigate(`/pai/membros/${c.id}`)}>
              <Av c={c} />
              <div className="col grow" style={{ gap: 0 }}>
                <b style={{ fontSize: 14, fontWeight: 600 }}>{c.name} · {c.age} anos</b>
                <span className="muted t-cap">@{c.username}</span>
              </div>
              <b className="mint" style={{ fontSize: 15 }}>{c.balance.toLocaleString('pt-BR')} XP</b>
            </button>
          ))}
        </>
      )}
      {kids.length > 0 && tasks.length === 0 && (
        <Alert variant="promo" icon="list" title="Crie a primeira tarefa" action={<Button small onClick={() => navigate('/pai/tarefas/nova')}>Criar</Button>}>
          Defina quantos XP ela vale.
        </Alert>
      )}
    </ParentLayout>
  );
}

// ---------- membros ----------
export function Members() {
  const { data: kids } = useData(() => api.children());
  const { data: pend } = useData(() => api.submissions('pending'));
  const [pwFor, setPwFor] = useState<Child | null>(null);
  const [rmFor, setRmFor] = useState<Child | null>(null);
  const act = (icon: string, label: string, onClick: () => void, danger?: boolean) => (
    <button className="row" style={{ gap: 6, justifyContent: 'center', flex: 1, padding: '8px 4px', fontSize: 13, fontWeight: 600, color: danger ? 'var(--destructive)' : 'var(--foreground)' }} onClick={onClick}>
      <Icon name={icon} size={16} />{label}
    </button>
  );
  return (
    <ParentLayout active="membros">
      <div className="col" style={{ gap: 2 }}>
        <h1 className="t-l">Membros</h1>
        <span className="muted t-cap">Adicione ou remova membros</span>
      </div>
      {kids && kids.length === 0 && <Alert icon="info" title="Dica">O filho entra com o usuário e a senha que você definir. Não precisa de e-mail.</Alert>}
      {!kids ? <Loading /> : kids.length === 0 ? (
        <>
          <Empty icon="users" title="Ainda não há membros na família" text="" />
          <Button icon="plus" onClick={() => navigate('/pai/membros/novo')}>Adicionar membro</Button>
        </>
      ) : (
        <>
          {kids.map((c) => (
            <div key={c.id} className="card col" style={{ gap: 12 }}>
              <button className="row" style={{ textAlign: 'left', width: '100%' }} onClick={() => navigate(`/pai/membros/${c.id}`)}>
                <Av c={c} />
                <div className="col grow" style={{ gap: 0 }}>
                  <b style={{ fontSize: 15 }}>{c.name} · {c.age} anos</b>
                  <span className="muted t-cap">@{c.username}</span>
                </div>
                <span className="badge soft">Nível {c.level}</span>
              </button>
              <div className="grid2">
                <div className="col center" style={{ gap: 0, background: 'var(--background)', borderRadius: 10, padding: '8px 0' }}><b className="mint">{c.balance.toLocaleString('pt-BR')} XP</b><span className="muted t-cap-s">Saldo</span></div>
                <div className="col center" style={{ gap: 0, background: 'var(--background)', borderRadius: 10, padding: '8px 0' }}><b>{(pend || []).filter((s) => s.childId === c.id).length}</b><span className="muted t-cap-s">Pendentes</span></div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                {act('edit', 'Editar', () => navigate(`/pai/membros/${c.id}/editar`))}
                {act('key', 'Nova senha', () => setPwFor(c))}
                {act('trash', 'Remover', () => setRmFor(c), true)}
              </div>
            </div>
          ))}
          <Button variant="outline" icon="plus" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }} onClick={() => navigate('/pai/membros/novo')}>Adicionar membro</Button>
        </>
      )}
      <ResetPasswordSheet child={pwFor || undefined} open={!!pwFor} onClose={() => setPwFor(null)} />
      <RemoveMemberSheet child={rmFor || undefined} open={!!rmFor} onClose={() => setRmFor(null)} />
    </ParentLayout>
  );
}

export function AddMember() {
  const [f, setF] = useState({ name: '', age: '', username: '', pass: '', pass2: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const save = async () => {
    const e: Record<string, string> = {};
    const age = parseInt(f.age, 10);
    if (!f.name.trim()) e.name = 'Informe o nome.';
    if (!(age >= 7 && age <= 18)) e.age = 'A idade deve ser entre 7 e 18 anos.';
    if (!/^[a-z0-9._]{3,20}$/.test(f.username.trim().toLowerCase())) e.username = 'De 3 a 20 caracteres: letras, números, ponto ou _ (sem espaços).';
    if (f.pass.length < 6) e.pass = 'Mínimo de 6 caracteres.';
    if (f.pass2 !== f.pass) e.pass2 = 'As senhas não coincidem.';
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const ok = await run(() => api.createChild({ name: f.name, age, username: f.username, password: f.pass }), 'Membro adicionado!');
    setBusy(false);
    if (ok) navigate('/pai/membros', true);
  };
  return (
    <div className="screen pad-bottom-actions">
      <TopBar title="Adicionar membro" />
      <Field label="Nome do filho(a)" error={err.name}><TextInput placeholder="Ex.: Lucas" value={f.name} onChange={(e) => set('name', e.target.value)} invalid={!!err.name} /></Field>
      <Field label="Idade" error={err.age} hint="De 7 a 18 anos. A idade define o conteúdo do app.">
        <TextInput inputMode="numeric" placeholder="Ex.: 14" value={f.age} onChange={(e) => set('age', e.target.value.replace(/\D/g, '').slice(0, 2))} invalid={!!err.age} />
      </Field>
      <h2 className="t-h mint" style={{ marginTop: 4 }}>Acesso do filho(a)</h2>
      <Field label="Nome de usuário" error={err.username} hint="Sem espaços. É com ele que seu filho entra.">
        <TextInput autoCapitalize="none" autoCorrect="off" placeholder="Ex.: lucas14" value={f.username} onChange={(e) => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))} invalid={!!err.username} />
      </Field>
      <Field label="Senha" error={err.pass}><PasswordInput placeholder="Mínimo de 6 caracteres" value={f.pass} onChange={(e) => set('pass', e.target.value)} /></Field>
      <Field label="Confirmar senha" error={err.pass2}><PasswordInput placeholder="Repita a senha" value={f.pass2} onChange={(e) => set('pass2', e.target.value)} /></Field>
      <div className="footer-actions"><Button disabled={busy} onClick={save}>Salvar membro</Button></div>
    </div>
  );
}

export function FollowChild({ id }: { id: string }) {
  const { data, error } = useData(() => api.childDetail(id), [id]);
  if (error) return <div className="screen"><TopBar title="Membro" onBack={() => navigate('/pai/membros')} /><Alert variant="destructive" icon="alert" title="Ops">{error}</Alert></div>;
  if (!data) return <div className="screen"><TopBar title="Membro" onBack={() => navigate('/pai/membros')} /><Loading /></div>;
  const { child, week, weekTotal, recent } = data;
  const max = Math.max(1, ...week.map((w) => w.xp));
  return (
    <div className="screen">
      <TopBar title={`${child.name} · ${child.age} anos`} onBack={() => navigate('/pai/membros')} right={<button className="back" onClick={() => navigate(`/pai/membros/${id}/editar`)} aria-label="Editar membro"><Icon name="edit" size={18} /></button>} />
      <div className="stats">
        <div className="card stat" style={{ padding: '12px 8px' }}><b style={{ fontSize: 18 }}>{child.balance.toLocaleString('pt-BR')} XP</b><span style={{ fontSize: 12 }}>Saldo</span></div>
        <div className="card stat" style={{ padding: '12px 8px' }}><b style={{ fontSize: 18 }}>{child.level}</b><span style={{ fontSize: 12 }}>Nível</span></div>
        <div className="card stat" style={{ padding: '12px 8px' }}><b style={{ fontSize: 18 }}>{child.streak} {child.streak === 1 ? 'dia' : 'dias'}</b><span style={{ fontSize: 12 }}>Sequência</span></div>
      </div>
      <h2 className="t-h">Semana</h2>
      <div className="card col">
        <div className="bars">
          {week.map((w, i) => (
            <div key={i}>
              <i className={w.xp === 0 ? 'zero' : ''} style={{ height: `${Math.max(3, (w.xp / max) * 100)}%` }} />
              <span>{w.label}</span>
            </div>
          ))}
        </div>
        <span className="muted t-cap">XP ganho por dia · total da semana: {weekTotal.toLocaleString('pt-BR')} XP</span>
      </div>
      <h2 className="t-h">Atividade recente</h2>
      {recent.length === 0 ? <Empty icon="list" title="Sem atividade" text="Quando houver tarefas aprovadas, elas aparecem aqui." /> : (
        <div className="card menu">
          {recent.map((e) => (
            <div key={e.id} className="list-item">
              <div className={`tile sm ${e.delta > 0 ? '' : 'dark'}`}><Icon name={e.delta > 0 ? 'check' : 'gift'} size={16} /></div>
              <div className="col grow" style={{ gap: 0 }}><b style={{ fontSize: 14, fontWeight: 600 }}>{e.reason}</b><span className="muted t-cap-s">{shortDate(e.createdAt)}</span></div>
              <b className={e.delta > 0 ? 'mint' : 'danger'} style={{ fontSize: 15 }}>{`${e.delta > 0 ? '+' : '−'}${Math.abs(e.delta).toLocaleString('pt-BR')}`}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EditMember({ id }: { id: string }) {
  const { data: c } = useData(() => api.child(id), [id]);
  const [f, setF] = useState<{ name: string; age: string; username: string } | null>(null);
  const [pw, setPw] = useState(false);
  const [rm, setRm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!c) return <div className="screen"><TopBar title="Editar membro" /><Loading /></div>;
  const v = f || { name: c.name, age: String(c.age), username: c.username };
  const set = (k: string, val: string) => setF({ ...v, [k]: val });
  const save = async () => {
    setBusy(true);
    const ok = await run(() => api.updateChild(id, { name: v.name, age: parseInt(v.age, 10), username: v.username }), 'Alterações salvas.');
    setBusy(false);
    if (ok) navigate(`/pai/membros/${id}`, true);
  };
  return (
    <div className="screen pad-bottom-actions">
      <TopBar title="Editar membro" />
      <Field label="Nome do filho(a)"><TextInput value={v.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Idade"><TextInput inputMode="numeric" value={v.age} onChange={(e) => set('age', e.target.value.replace(/\D/g, '').slice(0, 2))} /></Field>
      <Field label="Nome de usuário" hint="Mudar o usuário exige que o filho entre de novo."><TextInput autoCapitalize="none" value={v.username} onChange={(e) => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))} /></Field>
      <Button variant="outline" icon="key" onClick={() => setPw(true)}>Redefinir senha</Button>
      <Button variant="danger-outline" icon="trash" onClick={() => setRm(true)}>Remover membro</Button>
      <div className="footer-actions"><Button disabled={busy} onClick={save}>Salvar alterações</Button></div>

      <ResetPasswordSheet child={c} open={pw} onClose={() => setPw(false)} />
      <RemoveMemberSheet child={c} open={rm} onClose={() => setRm(false)} onDone={() => navigate('/pai/membros', true)} />
    </div>
  );
}

// ---------- tarefas ----------
const TEMPLATES = [
  { title: 'Arrumar a cama', description: 'Antes de sair de casa.', xp: 50, repeat: 'daily' as Repeat },
  { title: 'Estudar 30 minutos', description: 'Lição de casa ou leitura.', xp: 100, repeat: 'daily' as Repeat },
  { title: 'Lavar a louça', description: 'Depois do jantar.', xp: 150, repeat: 'daily' as Repeat },
  { title: 'Organizar o quarto', description: 'Roupas guardadas e mesa limpa.', xp: 200, repeat: 'weekly' as Repeat },
];

export function ParentTasks() {
  const { data: tasks } = useData(() => api.tasks());
  const { data: kids } = useData(() => api.children());
  const [who, setWho] = useState('all');
  const [tpl, setTpl] = useState(false);
  const [delT, setDelT] = useState<{ id: string; title: string; who: string } | null>(null);
  if (!tasks || !kids) return <ParentLayout active="tarefas"><Loading /></ParentLayout>;
  const list = tasks.filter((t) => who === 'all' || t.childId === who || t.childId === 'all');
  const nameOf = (id: string) => (id === 'all' ? 'Todos' : kids.find((k) => k.id === id)?.name || '—');
  return (
    <ParentLayout active="tarefas">
      <div className="row between">
        <div className="col" style={{ gap: 2 }}>
          <h1 className="t-l">Tarefas</h1>
          <span className="muted t-cap">{tasks.length === 0 ? 'Crie e gerencie as tarefas' : `${tasks.length} ${tasks.length === 1 ? 'tarefa ativa' : 'tarefas ativas'}`}</span>
        </div>
        {tasks.length > 0 && <button className="back" style={plusBtn} onClick={() => navigate('/pai/tarefas/nova')} aria-label="Nova tarefa"><Icon name="plus" size={20} /></button>}
      </div>
      {tasks.length === 0 ? (
        <>
          <Alert variant="promo" icon="list" title="Comece com modelos" action={<Button small onClick={() => setTpl(true)}>Ver modelos</Button>}>Use tarefas prontas como “Arrumar a cama”.</Alert>
          <Empty icon="list" title="Nenhuma tarefa criada" text="Crie a primeira tarefa e defina quantos XP ela vale." action={<Button icon="plus" onClick={() => navigate('/pai/tarefas/nova')}>Criar tarefa</Button>} />
        </>
      ) : (
        <>
          <div className="chips scroll">
            <Chip active={who === 'all'} onClick={() => setWho('all')}>Todos</Chip>
            {kids.map((k) => <Chip key={k.id} active={who === k.id} onClick={() => setWho(k.id)}>{k.name}</Chip>)}
          </div>
          {list.map((t) => (
            <div key={t.id} className="card col" style={{ gap: 10 }}>
              <div className="row">
                <div className="tile"><Icon name={t.icon} size={22} /></div>
                <div className="col grow" style={{ gap: 0, minWidth: 0 }}><b style={{ fontSize: 15 }}>{t.title}</b><span className="muted t-cap">{t.description}</span></div>
                <span className="badge">+{t.xp} XP</span>
              </div>
              <div className="row between">
                <div className="chips"><Chip icon="user">{nameOf(t.childId)}</Chip><Chip icon="clock">{repeatLabel(t.repeat)}</Chip>{t.needsPhoto && <Chip icon="camera">Foto</Chip>}{t.groupId && <Chip icon="users">Conjunta</Chip>}{t.dueAt && <Chip icon="clock" tone={t.dueAt < Date.now() ? 'late' : undefined}>{t.dueAt < Date.now() ? 'Prazo vencido' : `Até ${deadlineText(t.dueAt)}`}</Chip>}{!!t.penalty && <Chip tone="warn">−{t.penalty} XP</Chip>}</div>
                <div className="row" style={{ gap: 0, flex: 'none' }}>
                  <button style={bareBtn} onClick={() => navigate(`/pai/tarefas/${t.id}`)} aria-label={`Editar ${t.title}`}><Icon name="edit" size={18} /></button>
                  <button style={{ ...bareBtn, color: 'var(--destructive)' }} onClick={() => setDelT({ id: t.id, title: t.title, who: nameOf(t.childId) })} aria-label={`Excluir ${t.title}`}><Icon name="trash" size={18} /></button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
      <ConfirmSheet open={!!delT} onClose={() => setDelT(null)} title="Excluir tarefa?" text={delT ? `“${delT.title}” deixa de aparecer para ${delT.who === 'Todos' ? 'seus filhos' : delT.who}. O XP já ganho continua no saldo.` : ''} label="Excluir tarefa" onConfirm={async () => { if (delT && (await run(() => api.deleteTask(delT.id), 'Tarefa excluída.'))) setDelT(null); }} />
      <Sheet open={tpl} onClose={() => setTpl(false)}>
        <h2 className="t-m">Modelos de tarefa</h2>
        {TEMPLATES.map((t, i) => (
          <button key={t.title} className="card tight row clickable" style={{ textAlign: 'left', width: '100%' }} onClick={() => { setTpl(false); navigate(`/pai/tarefas/nova?modelo=${i}`); }}>
            <div className="col grow" style={{ gap: 0 }}><b className="t-label">{t.title}</b><span className="muted t-cap">{t.description}</span></div>
            <span className="badge">+{t.xp} XP</span>
          </button>
        ))}
      </Sheet>
    </ParentLayout>
  );
}

export function TaskForm({ id }: { id?: string }) {
  const { data: kids } = useData(() => api.children());
  const { data: existing } = useData(async () => (id ? api.task(id) : undefined), [id]);
  const m = TEMPLATES[parseInt(currentQuery().get('modelo') || '-1', 10)];
  const [f, setF] = useState<{ title: string; description: string; xp: string; childIds: string[]; repeat: Repeat; needsPhoto: boolean; joint: boolean; dueAt: number | null; penalty: string } | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!kids || (id && !existing)) return <div className="screen"><TopBar title={id ? 'Editar tarefa' : 'Criar tarefa'} /><Loading /></div>;
  const v =
    f ||
    (existing
      ? { title: existing.title, description: existing.description, xp: String(existing.xp), childIds: [existing.childId], repeat: existing.repeat, needsPhoto: existing.needsPhoto, joint: !!existing.groupId, dueAt: existing.dueAt || null, penalty: String(existing.penalty || 0) }
      : { title: m?.title || '', description: m?.description || '', xp: String(m?.xp || 100), childIds: kids[0] ? [kids[0].id] : [], repeat: (m?.repeat || 'daily') as Repeat, needsPhoto: false, joint: false, dueAt: null, penalty: '0' });
  const set = (p: Partial<typeof v>) => setF({ ...v, ...p });
  const save = async () => {
    const e: Record<string, string> = {};
    const xp = parseInt(v.xp, 10);
    if (!v.title.trim()) e.title = 'Informe o título.';
    if (!(xp > 0 && xp <= 5000)) e.xp = 'Digite um valor de 1 a 5000.';
    if (!v.childIds.length) e.child = kids.length ? 'Escolha pelo menos um membro.' : 'Adicione um membro antes de criar tarefas.';
    const penalty = parseInt(v.penalty || '0', 10) || 0;
    const dueAt = v.repeat === 'once' ? v.dueAt : null;
    if (dueAt && !id && dueAt < Date.now()) e.due = 'Escolha uma data e hora no futuro.';
    if (penalty > 0 && !dueAt) e.due = 'Para perder XP, defina um prazo.';
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const ok = await run(() => api.saveTask({ id, title: v.title, description: v.description, xp, childId: v.childIds[0], childIds: v.childIds, joint: v.joint && v.childIds.length > 1, repeat: v.repeat, needsPhoto: v.needsPhoto, dueAt, penalty: dueAt ? penalty : 0 }), id ? 'Tarefa atualizada.' : v.childIds.length > 1 ? 'Tarefas criadas!' : 'Tarefa criada!');
    setBusy(false);
    if (ok) navigate('/pai/tarefas', true);
  };
  return (
    <div className="screen pad-bottom-actions">
      <TopBar title={id ? 'Editar tarefa' : 'Criar tarefa'} onBack={() => navigate('/pai/tarefas')} />
      <Field label="Título" error={err.title}><TextInput placeholder="Ex.: Arrumar o quarto" value={v.title} onChange={(e) => set({ title: e.target.value })} invalid={!!err.title} /></Field>
      <Field label="Descrição (opcional)"><textarea className="textarea" placeholder="Explique o que precisa ser feito" value={v.description} onChange={(e) => set({ description: e.target.value })} /></Field>
      <Field label="Valor em XP" error={err.xp}>
        <div className="row">
          <TextInput inputMode="numeric" value={v.xp} onChange={(e) => set({ xp: e.target.value.replace(/\D/g, '').slice(0, 4) })} invalid={!!err.xp} />
          {[50, 100, 200].map((n) => <Chip key={n} onClick={() => set({ xp: String(n) })} active={v.xp === String(n)}>{n}</Chip>)}
        </div>
      </Field>
      <Field label="Para quem?" error={err.child}>
        <div className="chips">
          {id
            ? <Chip active icon="user">{kids.find((k) => k.id === v.childIds[0])?.name || '—'}</Chip>
            : (
              <>
                {kids.map((k) => <Chip key={k.id} active={v.childIds.includes(k.id)} onClick={() => set({ childIds: v.childIds.includes(k.id) ? v.childIds.filter((x) => x !== k.id) : [...v.childIds, k.id] })}>{k.name}</Chip>)}
                {kids.length > 1 && <Chip active={v.childIds.length === kids.length} onClick={() => set({ childIds: v.childIds.length === kids.length ? [] : kids.map((k) => k.id) })}>Todos</Chip>}
              </>
            )}
        </div>
      </Field>
      {!id && v.childIds.length > 1 && (
        <div className="card tight row">
          <div className="tile dark sm"><Icon name="users" size={16} /></div>
          <div className="col grow" style={{ gap: 0 }}><b className="t-label">Tarefa conjunta</b><span className="muted t-cap">O grupo faz junto; cada membro ganha o XP ao concluir a sua parte.</span></div>
          <Switch on={v.joint} onChange={(b) => set({ joint: b })} label="Tarefa conjunta" />
        </div>
      )}
      <Field label="Repetição">
        <div className="chips">{(['once', 'daily', 'weekly'] as Repeat[]).map((r) => <Chip key={r} active={v.repeat === r} onClick={() => set({ repeat: r })}>{repeatLabel(r)}</Chip>)}</div>
      </Field>
      {v.repeat === 'once' && (
        <>
          <Field label="Prazo para fazer (opcional)" error={err.due} hint="Depois desse horário o membro não consegue mais enviar a tarefa.">
            <div className="row">
              <div className="grow"><DateTimeInput label="Prazo da tarefa" value={v.dueAt} onChange={(ms) => set({ dueAt: ms })} invalid={!!err.due} /></div>
              {v.dueAt && <button type="button" className="back" style={{ width: 40, height: 40 }} onClick={() => set({ dueAt: null, penalty: '0' })} aria-label="Remover prazo"><Icon name="x" size={16} /></button>}
            </div>
          </Field>
          {v.dueAt && (
            <Field label="XP perdido se o prazo passar" hint="Descontado automaticamente do saldo do membro, uma vez. Deixe 0 para não descontar.">
              <div className="row">
                <TextInput inputMode="numeric" aria-label="XP perdido" value={v.penalty} onChange={(e) => set({ penalty: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
                {[25, 50, 100].map((n) => <Chip key={n} onClick={() => set({ penalty: String(n) })} active={v.penalty === String(n)}>{n}</Chip>)}
              </div>
            </Field>
          )}
        </>
      )}
      <div className="card tight row">
        <span className="mint" style={{ display: 'grid' }}><Icon name="camera" size={22} /></span>
        <div className="col grow" style={{ gap: 0 }}><b className="t-label">Pedir foto como prova</b><span className="muted t-cap">O filho envia uma foto ao concluir.</span></div>
        <Switch on={v.needsPhoto} onChange={(b) => set({ needsPhoto: b })} label="Pedir foto como prova" />
      </div>
      {id && <Button variant="danger-outline" icon="trash" onClick={() => setDel(true)}>Excluir tarefa</Button>}
      <div className="footer-actions"><Button disabled={busy} onClick={save}>{id ? 'Salvar alterações' : 'Salvar tarefa'}</Button></div>
      <ConfirmSheet open={del} onClose={() => setDel(false)} title="Excluir tarefa?" text={`“${v.title}” deixa de aparecer para ${v.childIds.length > 1 ? 'seus filhos' : kids.find((k) => k.id === v.childIds[0])?.name || 'seu filho'}. O XP já ganho continua no saldo.`} label="Excluir tarefa" onConfirm={async () => { if (await run(() => api.deleteTask(id!), 'Tarefa excluída.')) navigate('/pai/tarefas', true); }} />
    </div>
  );
}

// ---------- recompensas ----------
export function ParentRewards() {
  const { data: rewards } = useData(() => api.rewards());
  const { data: reds } = useData(() => api.redemptionsAll());
  const [tab, setTab] = useState<'ativas' | 'resgatadas'>('ativas');
  if (!rewards || !reds) return <ParentLayout active="loja"><Loading /></ParentLayout>;
  return (
    <ParentLayout active="loja">
      <div className="row between">
        <div className="col" style={{ gap: 2 }}><h1 className="t-l">Recompensas</h1><span className="muted t-cap">Prêmios que o XP pode comprar</span></div>
        {rewards.length > 0 && <button className="back" style={plusBtn} onClick={() => navigate('/pai/recompensas/nova')} aria-label="Nova recompensa"><Icon name="plus" size={20} /></button>}
      </div>
      {tab === 'ativas' && rewards.length > 0 && (
        <Alert variant="promo" icon="gift" title="Motive com recompensas" action={<Button small onClick={() => navigate('/pai/recompensas/nova')}>Criar</Button>}>Crie uma recompensa de 100 XP, como uma sobremesa.</Alert>
      )}
      {(rewards.length > 0 || reds.length > 0) && (
        <div className="chips">
          <Chip active={tab === 'ativas'} onClick={() => setTab('ativas')}>Ativas</Chip>
          <Chip active={tab === 'resgatadas'} onClick={() => setTab('resgatadas')}>Resgatadas · {reds.length}</Chip>
        </div>
      )}
      {tab === 'ativas' ? (
        rewards.length === 0 ? (
          <Empty icon="gift" title="Nenhuma recompensa criada" text="Crie prêmios para motivar seus filhos, como um passeio ou um jogo." action={<Button icon="plus" onClick={() => navigate('/pai/recompensas/nova')}>Criar recompensa</Button>} />
        ) : (
          <>
            {rewards.map((r) => (
              <div key={r.id} className="card tight row">
                <div className="tile"><Icon name={r.icon} size={22} /></div>
                <div className="col grow" style={{ gap: 0, minWidth: 0 }}><b style={{ fontSize: 15 }}>{r.title}</b><span className="muted t-cap">{r.description}</span>{r.expiresAt && <span style={{ marginTop: 6 }}><Chip icon="clock" tone={r.expiresAt < Date.now() ? 'late' : undefined}>{r.expiresAt < Date.now() ? 'Encerrada' : `Até ${deadlineText(r.expiresAt)}`}</Chip></span>}</div>
                <span className="badge">{r.cost} XP</span>
                <button style={bareBtn} onClick={() => navigate(`/pai/recompensas/${r.id}`)} aria-label={`Editar ${r.title}`}><Icon name="edit" size={18} /></button>
              </div>
            ))}
          </>
        )
      ) : reds.length === 0 ? (
        <Empty icon="gift" title="Nenhum resgate ainda" text="Quando seus filhos trocarem XP por prêmios, você vê aqui." />
      ) : (
        reds.map((x) => (
          <div key={x.id} className="card col" style={{ gap: 10 }}>
            <div className="row">
              <div className="tile"><Icon name={x.reward?.icon || 'gift'} size={22} /></div>
              <div className="col grow" style={{ gap: 0 }}><b style={{ fontSize: 15 }}>{x.reward?.title || 'Recompensa'}</b><span className="muted t-cap">{x.child?.name} · {shortDate(x.createdAt)} · −{x.cost} XP</span></div>
              {x.status === 'delivered'
                ? <span className="badge soft" style={{ background: 'rgba(108, 235, 168, 0.2)', border: 0 }}><Icon name="check" size={14} /> Entregue</span>
                : <span className="badge warn"><Icon name="clock" size={14} /> Pendente</span>}
            </div>
            {x.status === 'pending' && <Button small variant="primary" icon="check" onClick={() => run(() => api.markDelivered(x.id), 'Marcado como entregue.')}>Marcar como entregue</Button>}
          </div>
        ))
      )}
    </ParentLayout>
  );
}

export function RewardForm({ id }: { id?: string }) {
  const { data: kids } = useData(() => api.children());
  const { data: all } = useData(() => api.rewards());
  const existing = id ? all?.find((r) => r.id === id) : undefined;
  const [f, setF] = useState<{ title: string; description: string; cost: string; icon: string; childId: string; expiresAt: number | null } | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!kids || !all) return <div className="screen"><TopBar title="Recompensa" /><Loading /></div>;
  if (id && !existing) return <div className="screen"><TopBar title="Recompensa" onBack={() => navigate('/pai/recompensas')} /><Alert variant="destructive" icon="alert" title="Não encontrada">Essa recompensa não existe mais.</Alert></div>;
  const v = f || (existing ? { title: existing.title, description: existing.description, cost: String(existing.cost), icon: existing.icon, childId: existing.childId, expiresAt: existing.expiresAt || null } : { title: '', description: '', cost: '300', icon: 'gift', childId: 'all', expiresAt: null });
  const set = (p: Partial<typeof v>) => setF({ ...v, ...p });
  const save = async () => {
    const e: Record<string, string> = {};
    const cost = parseInt(v.cost, 10);
    if (!v.title.trim()) e.title = 'Informe o nome.';
    if (!(cost > 0 && cost <= 20000)) e.cost = 'Digite um valor de 1 a 20000.';
    if (v.expiresAt && !id && v.expiresAt < Date.now()) e.exp = 'Escolha uma data e hora no futuro.';
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const ok = await run(() => api.saveReward({ id, title: v.title, description: v.description, cost, icon: v.icon, childId: v.childId, expiresAt: v.expiresAt }), id ? 'Recompensa atualizada.' : 'Recompensa criada!');
    setBusy(false);
    if (ok) navigate('/pai/recompensas', true);
  };
  return (
    <div className="screen pad-bottom-actions">
      <TopBar title={id ? 'Editar recompensa' : 'Criar recompensa'} onBack={() => navigate('/pai/recompensas')} />
      <Field label="Nome da recompensa" error={err.title}><TextInput placeholder="Ex.: Sorvete no fim de semana" value={v.title} onChange={(e) => set({ title: e.target.value })} invalid={!!err.title} /></Field>
      <Field label="Descrição (opcional)"><textarea className="textarea" placeholder="Detalhes do prêmio" value={v.description} onChange={(e) => set({ description: e.target.value })} /></Field>
      <Field label="Custo em XP" error={err.cost}><TextInput inputMode="numeric" value={v.cost} onChange={(e) => set({ cost: e.target.value.replace(/\D/g, '').slice(0, 5) })} invalid={!!err.cost} /></Field>
      <Field label="Ícone">
        <div className="chips">{REWARD_ICONS.map((ic) => <button key={ic} className="tile" style={{ width: 48, height: 48, border: 'none', ...(v.icon === ic ? {} : { background: 'var(--card)', color: 'var(--primary)' }) }} onClick={() => set({ icon: ic })} aria-label={`Ícone ${ic}`} aria-pressed={v.icon === ic}><Icon name={ic} size={22} /></button>)}</div>
      </Field>
      <Field label="Disponível para">
        <div className="chips"><Chip active={v.childId === 'all'} onClick={() => set({ childId: 'all' })}>Todos</Chip>{kids.map((k) => <Chip key={k.id} active={v.childId === k.id} onClick={() => set({ childId: k.id })}>{k.name}</Chip>)}</div>
      </Field>
      <Field label="Disponível até (opcional)" error={err.exp} hint="Depois desse horário a recompensa some da loja.">
        <div className="row">
          <div className="grow"><DateTimeInput label="Prazo da recompensa" value={v.expiresAt} onChange={(ms) => set({ expiresAt: ms })} invalid={!!err.exp} /></div>
          {v.expiresAt && <button type="button" className="back" style={{ width: 40, height: 40 }} onClick={() => set({ expiresAt: null })} aria-label="Remover prazo"><Icon name="x" size={16} /></button>}
        </div>
      </Field>
      {id && <Button variant="danger-outline" icon="trash" onClick={() => setDel(true)}>Excluir recompensa</Button>}
      <div className="footer-actions"><Button disabled={busy} onClick={save}>{id ? 'Salvar alterações' : 'Salvar recompensa'}</Button></div>
      <ConfirmSheet open={del} onClose={() => setDel(false)} title="Excluir recompensa?" text={`“${v.title}” será removida da loja dos seus filhos.`} label="Excluir recompensa" onConfirm={async () => { if (await run(() => api.deleteReward(id!), 'Recompensa excluída.')) navigate('/pai/recompensas', true); }} />
    </div>
  );
}

// ---------- aprovações ----------
export function Approvals() {
  const { data: list } = useData(() => api.submissions('pending'));
  const [busy, setBusy] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);
  useEffect(() => {
    if (!okMsg) return;
    const t = setTimeout(() => setOkMsg(''), 3200);
    return () => clearTimeout(t);
  }, [okMsg]);
  return (
    <div className="screen">
      {zoom && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setZoom(null)}>
          <img src={zoom} alt="Foto enviada" />
          <button onClick={() => setZoom(null)} aria-label="Fechar"><Icon name="x" size={22} /></button>
        </div>
      )}
      <TopBar title="Aprovações pendentes" onBack={() => navigate('/pai')} />
      {okMsg && (
        <div className="toast" role="status" aria-live="polite">
          <Icon name="check" size={22} />
          <div className="col" style={{ gap: 0 }}><b style={{ fontSize: 14, fontWeight: 700 }}>Tarefa aprovada</b><span style={{ fontSize: 13, fontWeight: 400 }}>{okMsg}</span></div>
        </div>
      )}
      {!list ? <Loading /> : list.length === 0 ? (
        <Empty icon="check" title="Tudo em dia!" text="Quando seus filhos enviarem tarefas, elas aparecem aqui para você aprovar." />
      ) : (
        <>
          {list.map((s) => (
            <div key={s.id} className="card col" style={{ gap: 12 }}>
              <div className="row">
                <div className="avatar">{s.child?.name[0]}</div>
                <div className="col grow" style={{ gap: 0 }}><b style={{ fontSize: 15 }}>{s.task?.title}</b><span className="muted t-cap">{s.child?.name} · {when(s.createdAt)}</span></div>
                <span className="badge">+{s.task?.xp} XP</span>
              </div>
              {s.photo ? (
                <button className="photo-thumb" onClick={() => setZoom(s.photo!)} aria-label="Ver foto em tela cheia">
                  <img src={s.photo} alt={`Foto enviada por ${s.child?.name}`} />
                  <span className="zoom"><Icon name="eye" size={14} /> Ver foto</span>
                </button>
              ) : (
                <span className="muted t-cap"><Icon name="info" size={13} /> Sem foto anexada</span>
              )}
              <div className="row">
                <Button small className="grow" variant="danger-outline" icon="x" style={{ borderWidth: 1.5 }} onClick={() => navigate(`/pai/aprovacoes/${s.id}/recusar`)}>Recusar</Button>
                <Button small className="grow" icon="check" disabled={busy === s.id} onClick={async () => { setBusy(s.id); const ok = await run(() => api.approve(s.id)); setBusy(null); if (ok) setOkMsg(`+${s.task?.xp} XP creditados para ${s.child?.name}`); }}>Aprovar</Button>
              </div>
            </div>
          ))}
          <p className="muted t-cap"><span className="mint"><Icon name="info" size={16} /></span> Ao aprovar, o XP é creditado no saldo do seu filho na hora.</p>
        </>
      )}
    </div>
  );
}

export function Reject({ id }: { id: string }) {
  const { data: list } = useData(() => api.submissions('pending'));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const s = list?.find((x) => x.id === id);
  const close = () => navigate('/pai/aprovacoes', true);
  return (
    <>
      <Approvals />
      <Sheet open onClose={close}>
        {list && !s ? (
          <>
            <h2 className="t-m">Já analisada</h2>
            <p className="muted t-cap">Esse envio não está mais pendente.</p>
            <Button variant="outline" onClick={close}>Voltar</Button>
          </>
        ) : (
          <>
            <h2 className="t-m">Recusar tarefa?</h2>
            <p className="muted t-cap">Explique para {s?.child?.name || 'seu filho'} o que faltou. Ele poderá enviar de novo.</p>
            <Field label="Motivo (opcional)"><textarea className="textarea" placeholder="Ex.: faltou resolver os últimos exercícios" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <Button variant="danger" icon="x" disabled={busy} onClick={async () => { setBusy(true); const ok = await run(() => api.reject(id, reason), 'Tarefa recusada. Seu filho foi avisado.'); setBusy(false); if (ok) close(); }}>Recusar e avisar</Button>
            <Button variant="outline" onClick={close}>Cancelar</Button>
          </>
        )}
      </Sheet>
    </>
  );
}

// ---------- perfil e extras ----------
export function ParentProfile() {
  const [out, setOut] = useState(false);
  const real = getSession()?.mode === 'real';
  const { data: pname } = useData(() => api.parentName());
  const { data: pemail } = useData(() => api.parentEmail());
  const row = (icon: string, label: string, path: string) => (
    <button className="list-item" onClick={() => navigate(path)}><div className="tile dark sm"><Icon name={icon} size={18} /></div><span className="label">{label}</span><Icon name="chevron" size={16} className="dim" /></button>
  );
  return (
    <ParentLayout active="perfil">
      <div className="hero" style={{ paddingTop: 8 }}>
        <div className="avatar xl ring" style={{ width: 88, height: 88 }}>{(real && pname ? pname[0] : 'R').toUpperCase()}</div>
        <h1 className="t-l">{real && pname ? pname : 'Responsável'}</h1>
        <span className="muted">{real ? pemail || 'Conta do responsável' : 'Modo demonstração'}</span>
      </div>
      <div className="card menu">
        {row('users', 'Membros da família', '/pai/membros')}
        {row('shield', 'Privacidade e consentimento (LGPD)', '/pai/privacidade')}
        {row('chart', 'Relatórios', '/pai/relatorios')}
        {row('info', 'Sobre o money task', '/sobre')}
      </div>
      <InstallBanner />
      {!real && <Button variant="outline" icon="refresh" onClick={() => { api.resetDemo(); toast('Demonstração reiniciada.'); }}>Reiniciar dados da demonstração</Button>}
      <Button variant="danger-outline" icon="logout" onClick={() => setOut(true)}>Sair</Button>
      <Sheet open={out} onClose={() => setOut(false)}>
        <div className="tile lg icon-top"><Icon name="logout" size={26} /></div>
        <h2 className="t-m" style={{ textAlign: 'center' }}>Sair da conta?</h2>
        <p className="muted t-cap" style={{ textAlign: 'center' }}>Você poderá entrar de novo com seu e-mail e senha.</p>
        <Button variant="danger" onClick={async () => { await api.logout(); navigate('/entrar', true); }}>Sair</Button>
        <Button variant="outline" onClick={() => setOut(false)}>Cancelar</Button>
      </Sheet>
    </ParentLayout>
  );
}

export function Privacy() {
  const [del, setDel] = useState(false);
  const [conf, setConf] = useState('');
  const [busyDel, setBusyDel] = useState(false);
  const download = async () => {
    const json = await api.exportData();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'money-task-meus-dados.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('Arquivo gerado.');
  };
  return (
    <div className="screen">
      <TopBar title="Privacidade e LGPD" onBack={() => navigate('/pai/perfil')} />
      <div className="card col">
        <b className="t-h">O que guardamos dos seus filhos</b>
        {['Nome e idade', 'Nome de usuário e senha (protegida)', 'XP, tarefas e resgates'].map((t) => <span key={t} style={{ fontSize: 13 }}><span className="mint"><Icon name="check" size={16} /></span> {t}</span>)}
      </div>
      <Alert icon="shield" title="Consentimento registrado">Você autorizou o tratamento dos dados dos seus filhos ao criar a conta.</Alert>
      <Button variant="outline" icon="download" onClick={download}>Baixar meus dados</Button>
      <Button variant="danger-outline" icon="trash" onClick={() => setDel(true)}>Excluir conta e todos os dados</Button>
      <Sheet open={del} onClose={() => { setDel(false); setConf(''); }}>
        <div className="tile lg locked icon-top" style={{ color: 'var(--destructive)' }}><Icon name="alert" size={28} /></div>
        <h2 className="t-m" style={{ textAlign: 'center' }}>Excluir tudo?</h2>
        <p className="muted t-cap" style={{ textAlign: 'center' }}>Sua conta e os perfis de todos os filhos serão apagados para sempre. Digite EXCLUIR para confirmar.</p>
        <Field label="Confirmação"><TextInput placeholder="EXCLUIR" autoCapitalize="characters" value={conf} onChange={(e) => setConf(e.target.value)} /></Field>
        <Button variant="danger" icon="trash" disabled={busyDel || conf.trim().toUpperCase() !== 'EXCLUIR'} onClick={async () => { setBusyDel(true); const ok = await run(() => api.deleteAccount()); setBusyDel(false); if (ok) navigate('/entrar', true); }}>{busyDel ? 'Excluindo…' : 'Excluir definitivamente'}</Button>
        <Button variant="outline" onClick={() => { setDel(false); setConf(''); }}>Cancelar</Button>
      </Sheet>
    </div>
  );
}

export function Reports() {
  const [p, setP] = useState<'week' | 'month'>('week');
  const { data } = useData(() => api.reports(p), [p]);
  return (
    <div className="screen">
      <TopBar title="Relatórios" onBack={() => navigate('/pai/perfil')} />
      <div className="chips"><Chip active={p === 'week'} onClick={() => setP('week')}>Semana</Chip><Chip active={p === 'month'} onClick={() => setP('month')}>Mês</Chip></div>
      {!data ? <Loading /> : (
        <>
          <div className="grid2">
            <div className="card stat"><b>{data.total.toLocaleString('pt-BR')}</b><span>XP da família</span></div>
            <div className="card stat"><b>{data.tasks}</b><span>Tarefas feitas</span></div>
          </div>
          <h2 className="t-h">XP por filho</h2>
          {data.perChild.length === 0 ? <Empty icon="chart" title="Sem dados" text="Adicione membros para ver os relatórios." /> : data.perChild.map((c) => {
            const max = Math.max(1, ...data.perChild.map((x) => x.xp));
            return (
              <div key={c.child.id} className="card tight col" style={{ gap: 8 }}>
                <div className="row between"><b className="t-label">{c.child.name}</b><b className="mint">{c.xp.toLocaleString('pt-BR')} XP</b></div>
                <Progress pct={(c.xp / max) * 100} />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
