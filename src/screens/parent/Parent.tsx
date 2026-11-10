import { useState, type ReactNode } from 'react';
import { api, getSession } from '../../lib/api';
import { navigate, currentQuery } from '../../lib/router';
import { Alert, BottomNav, Button, Chip, DateTimeInput, Empty, Field, Loading, PasswordInput, Progress, Sheet, Switch, TextInput, TopBar, run, toast, useData, deadlineText, when, xpText, type NavItem } from '../../ui/kit';
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

const Av = ({ c, size }: { c: Child; size?: number }) => <div className="avatar" style={{ fontWeight: 700, fontSize: size ? 18 : 17, ...(size ? { width: size, height: size } : {}) }}>{c.name[0].toUpperCase()}</div>;
const repeatLabel = (r: Repeat) => (r === 'daily' ? 'Diária' : r === 'weekly' ? 'Semanal' : 'Uma vez');

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
        {kids.length > 0 && (
          <button className="back" onClick={() => navigate('/pai/aprovacoes')} aria-label="Aprovações pendentes">
            <Icon name="bell" size={20} />
          </button>
        )}
      </div>
      {kids.length === 0 && (
        <div className="alert promo stack">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <span className="alert-icon"><Icon name="users" size={22} /></span>
            <div className="alert-body">
              <span className="alert-title">Quer ver o app em ação?</span>
              <span className="alert-desc">Explore o modo demonstração com dados de exemplo. Nada é salvo.</span>
            </div>
          </div>
          <Button className="btn-block-sm" onClick={() => navigate('/demo')}>Explorar demonstração</Button>
        </div>
      )}

      {first ? (
        <button className="alert warning" style={{ textAlign: 'left', width: '100%', borderColor: 'var(--warning)', borderRadius: 16, padding: 14, background: 'rgba(253, 253, 147, 0.12)' }} onClick={() => navigate('/pai/aprovacoes')}>
          <span className="tile md warn"><Icon name="clock" size={22} /></span>
          <span className="alert-body">
            <span className="alert-title" style={{ fontSize: 15, fontWeight: 700 }}>{pend.length === 1 ? '1 tarefa para aprovar' : `${pend.length} tarefas para aprovar`}</span>
            <span className="alert-desc">{first.child?.name} enviou “{first.task?.title}”</span>
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
            <button key={c.id} className="card tight clickable row" style={{ textAlign: 'left', width: '100%', padding: '12px 14px' }} onClick={() => navigate(`/pai/membros/${c.id}`)}>
              <Av c={c} />
              <div className="col grow" style={{ gap: 0 }}>
                <b className="semi" style={{ fontSize: 14 }}>{c.name} · {c.age} anos</b>
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
function ResetPasswordSheet({ child, open, onClose }: { child: Child; open: boolean; onClose: () => void }) {
  const [np, setNp] = useState('');
  const [np2, setNp2] = useState('');
  const [err, setErr] = useState('');
  const close = () => { setNp(''); setNp2(''); setErr(''); onClose(); };
  return (
    <Sheet open={open} onClose={close}>
      <h2 className="t-m" style={{ textAlign: 'center' }}>Nova senha do {child.name}</h2>
      <p className="muted t-cap" style={{ textAlign: 'center' }}>Ele precisará usar a nova senha no próximo acesso.</p>
      <Field label="Nova senha" error={err}><PasswordInput placeholder="Mínimo de 6 caracteres" value={np} onChange={(e) => setNp(e.target.value)} /></Field>
      <Field label="Confirmar senha"><PasswordInput placeholder="Repita a senha" value={np2} onChange={(e) => setNp2(e.target.value)} /></Field>
      <Button onClick={async () => {
        if (np.length < 6) return setErr('Mínimo de 6 caracteres.');
        if (np !== np2) return setErr('As senhas não coincidem.');
        setErr('');
        if (await run(() => api.resetChildPassword(child.id, np), 'Senha redefinida.')) close();
      }}>Salvar nova senha</Button>
      <Button variant="outline" onClick={close}>Cancelar</Button>
    </Sheet>
  );
}

function RemoveChildSheet({ child, open, onClose, onDone }: { child: Child; open: boolean; onClose: () => void; onDone: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="tile lg danger icon-top"><Icon name="alert" size={26} /></div>
      <h2 className="t-m" style={{ textAlign: 'center' }}>Remover o {child.name}?</h2>
      <p className="muted t-cap" style={{ textAlign: 'center' }}>O histórico de XP, tarefas e resgates dele será apagado e não poderá ser recuperado.</p>
      <Button variant="danger" icon="trash" onClick={async () => { if (await run(() => api.removeChild(child.id), 'Membro removido.')) { onClose(); onDone(); } }}>Remover membro</Button>
      <Button variant="outline" onClick={onClose}>Cancelar</Button>
    </Sheet>
  );
}

export function Members() {
  const { data: kids } = useData(() => api.children());
  const { data: pend } = useData(() => api.submissions('pending'));
  const [pw, setPw] = useState<Child | null>(null);
  const [rm, setRm] = useState<Child | null>(null);
  return (
    <ParentLayout active="membros">
      <div className="col" style={{ gap: 2 }}>
        <h1 className="t-l">Membros</h1>
        <span className="muted t-cap">Adicione ou remova membros</span>
      </div>
      {!kids ? <Loading /> : kids.length === 0 ? (
        <>
          <Alert icon="info" title="Dica">O filho entra com o usuário e a senha que você definir. Não precisa de e-mail.</Alert>
          <Empty icon="users" title="Ainda não há membros na família" text="" />
          <Button icon="plus" onClick={() => navigate('/pai/membros/novo')}>Adicionar membro</Button>
        </>
      ) : (
        <>
          {kids.map((c) => {
            const n = (pend || []).filter((x) => x.childId === c.id).length;
            return (
              <div key={c.id} className="card bordered col" style={{ gap: 12, padding: 14 }}>
                <button className="row" style={{ textAlign: 'left', width: '100%' }} onClick={() => navigate(`/pai/membros/${c.id}`)}>
                  <Av c={c} size={44} />
                  <div className="col grow" style={{ gap: 0 }}>
                    <b className="bold" style={{ fontSize: 15 }}>{c.name} · {c.age} anos</b>
                    <span className="muted t-cap">@{c.username}</span>
                  </div>
                  <span className="badge" style={{ height: 'auto', padding: '5px 10px', fontSize: 12, fontWeight: 600 }}>Nível {c.level}</span>
                </button>
                <div className="mini-metrics">
                  <div><span className="muted t-cap-s">Saldo</span><b className="mint" style={{ fontSize: 15 }}>{c.balance.toLocaleString('pt-BR')} XP</b></div>
                  <div><span className="muted t-cap-s">Pendentes</span><b style={{ fontSize: 15 }}>{n} {n === 1 ? 'tarefa' : 'tarefas'}</b></div>
                </div>
                <div className="mini-actions">
                  <button onClick={() => navigate(`/pai/membros/${c.id}/editar`)}><Icon name="edit" size={14} /> Editar</button>
                  <button onClick={() => setPw(c)}><Icon name="key" size={14} /> Nova senha</button>
                  <button className="del" onClick={() => setRm(c)}><Icon name="trash" size={14} /> Remover</button>
                </div>
              </div>
            );
          })}
          <Button variant="outline" icon="plus" style={{ borderColor: 'var(--ring)', color: 'var(--primary)' }} onClick={() => navigate('/pai/membros/novo')}>Adicionar membro</Button>
        </>
      )}
      {pw && <ResetPasswordSheet child={pw} open onClose={() => setPw(null)} />}
      {rm && <RemoveChildSheet child={rm} open onClose={() => setRm(null)} onDone={() => setRm(null)} />}
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
        <div className="card stat"><b>{child.balance.toLocaleString('pt-BR')} XP</b><span>Saldo</span></div>
        <div className="card stat"><b>{child.level}</b><span>Nível</span></div>
        <div className="card stat"><b>{child.streak} {child.streak === 1 ? 'dia' : 'dias'}</b><span>Sequência</span></div>
      </div>
      <h2 className="t-s">Semana</h2>
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
      <h2 className="t-s">Atividade recente</h2>
      {recent.length === 0 ? <Empty icon="list" title="Sem atividade" text="Quando houver tarefas aprovadas, elas aparecem aqui." /> : (
        <div className="card menu">
          {recent.map((e) => (
            <div key={e.id} className="list-item">
              <div className="tile dark sm"><Icon name={e.delta > 0 ? 'check' : 'gift'} size={16} /></div>
              <div className="col grow" style={{ gap: 0 }}><b className="t-label">{e.reason}</b><span className="muted t-cap">{when(e.createdAt)}</span></div>
              <b className={e.delta > 0 ? 'mint' : 'danger'}>{xpText(e.delta)}</b>
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
      <div className="footer-actions"><Button disabled={busy} onClick={save}>Salvar alterações</Button></div>
      <ResetPasswordSheet child={c} open={pw} onClose={() => setPw(false)} />
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
  const [del, setDel] = useState<{ id: string; title: string; child: string } | null>(null);
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
        {tasks.length > 0 && <button className="round-add" onClick={() => navigate('/pai/tarefas/nova')} aria-label="Nova tarefa"><Icon name="plus" size={20} /></button>}
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
            <div key={t.id} className="card col" style={{ gap: 10, padding: 14, borderRadius: 14 }}>
              <div className="row">
                <div className="tile md"><Icon name={t.icon} size={22} /></div>
                <div className="col grow" style={{ gap: 0, minWidth: 0 }}><b className="bold" style={{ fontSize: 15 }}>{t.title}</b><span className="muted t-cap">{t.description}</span></div>
                <span className="badge">+{t.xp} XP</span>
              </div>
              <div className="row between">
                <div className="chips"><Chip icon="user">{nameOf(t.childId)}</Chip><Chip icon="clock">{repeatLabel(t.repeat)}</Chip>{t.needsPhoto && <Chip icon="camera">Foto</Chip>}{t.groupId && <Chip icon="users">Conjunta</Chip>}{t.dueAt && <Chip icon="clock" tone={t.dueAt < Date.now() ? 'late' : undefined}>{t.dueAt < Date.now() ? 'Prazo vencido' : `Até ${deadlineText(t.dueAt)}`}</Chip>}{!!t.penalty && <Chip tone="warn">−{t.penalty} XP</Chip>}</div>
                <div className="row" style={{ gap: 0, flex: 'none' }}>
                  <button className="icon-btn" onClick={() => navigate(`/pai/tarefas/${t.id}`)} aria-label={`Editar ${t.title}`}><Icon name="edit" size={18} /></button>
                  <button className="icon-btn del" onClick={() => setDel({ id: t.id, title: t.title, child: nameOf(t.childId) })} aria-label={`Excluir ${t.title}`}><Icon name="trash" size={18} /></button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
      <Sheet open={!!del} onClose={() => setDel(null)}>
        {del && (
          <>
            <div className="tile lg danger icon-top"><Icon name="trash" size={26} /></div>
            <h2 className="t-m" style={{ textAlign: 'center' }}>Excluir tarefa?</h2>
            <p className="muted t-cap" style={{ textAlign: 'center' }}>“{del.title}” deixa de aparecer para {del.child === 'Todos' ? 'seus filhos' : `o ${del.child}`}. O XP já ganho continua no saldo.</p>
            <Button variant="danger" onClick={async () => { if (await run(() => api.deleteTask(del.id), 'Tarefa excluída.')) setDel(null); }}>Excluir tarefa</Button>
            <Button variant="outline" onClick={() => setDel(null)}>Cancelar</Button>
          </>
        )}
      </Sheet>
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
    if (!v.childIds.length) e.child = kids.length ? 'Escolha pelo menos um filho.' : 'Adicione um membro antes de criar tarefas.';
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
      <div className="row" style={{ alignItems: 'flex-end', gap: 12 }}>
        <div className="grow"><Field label="Valor em XP" error={err.xp}>
          <TextInput inputMode="numeric" value={v.xp} onChange={(e) => set({ xp: e.target.value.replace(/\D/g, '').slice(0, 4) })} invalid={!!err.xp} />
        </Field></div>
        <div className="chips" style={{ flexWrap: 'nowrap' }}>{[50, 100, 200].map((n) => <Chip key={n} onClick={() => set({ xp: String(n) })} active={v.xp === String(n)}>{n}</Chip>)}</div>
      </div>
      <Field label="Para quem?" error={err.child}>
        <div className="chips">
          {id
            ? <Chip active>{kids.find((k) => k.id === v.childIds[0])?.name || '—'}</Chip>
            : (
              <>
                {kids.map((k) => <Chip key={k.id} active={v.childIds.includes(k.id)} onClick={() => set({ childIds: v.childIds.includes(k.id) ? v.childIds.filter((x) => x !== k.id) : [...v.childIds, k.id] })}>{k.name}</Chip>)}
              </>
            )}
        </div>
      </Field>
      {!id && v.childIds.length > 1 && (
        <div className="card tight row">
          <div className="tile dark sm"><Icon name="users" size={16} /></div>
          <div className="col grow" style={{ gap: 0 }}><b className="t-label">Tarefa conjunta</b><span className="muted t-cap">O grupo faz junto; cada filho ganha o XP ao concluir a sua parte.</span></div>
          <Switch on={v.joint} onChange={(b) => set({ joint: b })} label="Tarefa conjunta" />
        </div>
      )}
      <Field label="Repetição">
        <div className="chips">{(['once', 'daily', 'weekly'] as Repeat[]).map((r) => <Chip key={r} active={v.repeat === r} onClick={() => set({ repeat: r })}>{repeatLabel(r)}</Chip>)}</div>
      </Field>
      {v.repeat === 'once' && (
        <>
          <Field label="Prazo para fazer (opcional)" error={err.due} hint="Depois desse horário o filho não consegue mais enviar a tarefa.">
            <div className="row">
              <div className="grow"><DateTimeInput label="Prazo da tarefa" value={v.dueAt} onChange={(ms) => set({ dueAt: ms })} invalid={!!err.due} /></div>
              {v.dueAt && <button type="button" className="back" style={{ width: 40, height: 40 }} onClick={() => set({ dueAt: null, penalty: '0' })} aria-label="Remover prazo"><Icon name="x" size={16} /></button>}
            </div>
          </Field>
          {v.dueAt && (
            <Field label="XP perdido se o prazo passar" hint="Descontado automaticamente do saldo do filho, uma vez. Deixe 0 para não descontar.">
              <div className="row">
                <TextInput inputMode="numeric" aria-label="XP perdido" value={v.penalty} onChange={(e) => set({ penalty: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
                {[25, 50, 100].map((n) => <Chip key={n} onClick={() => set({ penalty: String(n) })} active={v.penalty === String(n)}>{n}</Chip>)}
              </div>
            </Field>
          )}
        </>
      )}
      <div className="card tight row" style={{ padding: '12px 14px' }}>
        <span className="mint"><Icon name="camera" size={22} /></span>
        <div className="col grow" style={{ gap: 0 }}><b className="semi" style={{ fontSize: 14 }}>Pedir foto como prova</b><span className="muted t-cap-s">O filho envia uma foto ao concluir.</span></div>
        <Switch on={v.needsPhoto} onChange={(b) => set({ needsPhoto: b })} label="Pedir foto como prova" />
      </div>
      <div className="footer-actions"><Button disabled={busy} onClick={save}>{id ? 'Salvar alterações' : 'Salvar tarefa'}</Button></div>
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
        {rewards.length > 0 && <button className="round-add" onClick={() => navigate('/pai/recompensas/nova')} aria-label="Nova recompensa"><Icon name="plus" size={20} /></button>}
      </div>
      {rewards.length > 0 && (
        <>
          <Alert variant="promo" icon="gift" title="Motive com recompensas" action={<Button small onClick={() => navigate('/pai/recompensas/nova')}>Criar</Button>}>Crie uma recompensa de 100 XP, como uma sobremesa.</Alert>
          <div className="chips">
            <Chip active={tab === 'ativas'} onClick={() => setTab('ativas')}>Ativas</Chip>
            <Chip active={tab === 'resgatadas'} onClick={() => setTab('resgatadas')}>Resgatadas · {reds.length}</Chip>
          </div>
        </>
      )}
      {tab === 'ativas' ? (
        rewards.length === 0 ? (
          <Empty icon="gift" title="Nenhuma recompensa criada" text="Crie prêmios para motivar seus filhos, como um passeio ou um jogo." action={<Button icon="plus" onClick={() => navigate('/pai/recompensas/nova')}>Criar recompensa</Button>} />
        ) : (
          <>
            {rewards.map((r) => (
              <div key={r.id} className="card tight row">
                <div className="tile md"><Icon name={r.icon} size={22} /></div>
                <div className="col grow" style={{ gap: 0, minWidth: 0 }}><b className="bold" style={{ fontSize: 15 }}>{r.title}</b><span className="muted t-cap">{r.description}</span>{r.expiresAt && <span style={{ marginTop: 6 }}><Chip icon="clock" tone={r.expiresAt < Date.now() ? 'late' : undefined}>{r.expiresAt < Date.now() ? 'Encerrada' : `Até ${deadlineText(r.expiresAt)}`}</Chip></span>}</div>
                <span className="badge">{r.cost} XP</span>
                <button className="icon-btn" onClick={() => navigate(`/pai/recompensas/${r.id}`)} aria-label={`Editar ${r.title}`}><Icon name="edit" size={18} /></button>
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
              <div className="tile md"><Icon name={x.reward?.icon || 'gift'} size={22} /></div>
              <div className="col grow" style={{ gap: 0 }}><b className="bold" style={{ fontSize: 15 }}>{x.reward?.title || 'Recompensa'}</b><span className="muted t-cap">{x.child?.name} · {when(x.createdAt)} · −{x.cost} XP</span></div>
              {x.status === 'delivered' ? <span className="badge soft"><Icon name="check" size={14} /> Entregue</span> : <span className="badge warn"><Icon name="clock" size={14} /> Pendente</span>}
            </div>
            {x.status === 'pending' && <Button variant="primary" icon="check" className="btn-block-sm" onClick={() => run(() => api.markDelivered(x.id), 'Marcado como entregue.')}>Marcar como entregue</Button>}
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
        <div className="chips">{REWARD_ICONS.map((ic) => <button key={ic} className={`tile xl ${v.icon === ic ? '' : 'dark'}`} style={{ border: v.icon === ic ? 'none' : '1px solid var(--border)' }} onClick={() => set({ icon: ic })} aria-label={`Ícone ${ic}`} aria-pressed={v.icon === ic}><Icon name={ic} size={22} /></button>)}</div>
      </Field>
      <Field label="Disponível até (opcional)" error={err.exp} hint="Depois desse horário a recompensa some da loja.">
        <div className="row">
          <div className="grow"><DateTimeInput label="Prazo da recompensa" value={v.expiresAt} onChange={(ms) => set({ expiresAt: ms })} invalid={!!err.exp} /></div>
          {v.expiresAt && <button type="button" className="back" style={{ width: 40, height: 40 }} onClick={() => set({ expiresAt: null })} aria-label="Remover prazo"><Icon name="x" size={16} /></button>}
        </div>
      </Field>
      <Field label="Disponível para">
        <div className="chips"><Chip active={v.childId === 'all'} onClick={() => set({ childId: 'all' })}>Todos</Chip>{kids.map((k) => <Chip key={k.id} active={v.childId === k.id} onClick={() => set({ childId: k.id })}>{k.name}</Chip>)}</div>
      </Field>
      {id && <Button variant="danger-outline" icon="trash" onClick={() => setDel(true)}>Excluir recompensa</Button>}
      <div className="footer-actions"><Button disabled={busy} onClick={save}>{id ? 'Salvar alterações' : 'Salvar recompensa'}</Button></div>
      <Sheet open={del} onClose={() => setDel(false)}>
        <div className="tile lg danger icon-top"><Icon name="trash" size={26} /></div>
        <h2 className="t-m" style={{ textAlign: 'center' }}>Excluir recompensa?</h2>
        <p className="muted t-cap" style={{ textAlign: 'center' }}>“{v.title}” será removida da loja dos seus filhos. Resgates já feitos continuam no histórico.</p>
        <Button variant="danger" onClick={async () => { if (await run(() => api.deleteReward(id!), 'Recompensa excluída.')) navigate('/pai/recompensas', true); }}>Excluir recompensa</Button>
        <Button variant="outline" onClick={() => setDel(false)}>Cancelar</Button>
      </Sheet>
    </div>
  );
}

// ---------- aprovações ----------
export function Approvals() {
  const { data: list } = useData(() => api.submissions('pending'));
  const [busy, setBusy] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);
  return (
    <div className="screen">
      {zoom && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setZoom(null)}>
          <img src={zoom} alt="Foto enviada" />
          <button onClick={() => setZoom(null)} aria-label="Fechar"><Icon name="x" size={22} /></button>
        </div>
      )}
      {okMsg && <Alert variant="success" icon="check" title="Tarefa aprovada">{okMsg}</Alert>}
      <TopBar title="Aprovações pendentes" onBack={() => navigate('/pai')} />
      {!list ? <Loading /> : list.length === 0 ? (
        <Empty icon="check" title="Tudo em dia!" text="Quando seus filhos enviarem tarefas, elas aparecem aqui para você aprovar." />
      ) : (
        <>
          {list.map((s) => (
            <div key={s.id} className="card col" style={{ gap: 12, padding: 14 }}>
              <div className="row">
                <div className="avatar" style={{ fontWeight: 700 }}>{s.child?.name[0]}</div>
                <div className="col grow" style={{ gap: 0 }}><b className="bold" style={{ fontSize: 15 }}>{s.task?.title}</b><span className="muted t-cap">{s.child?.name} · {when(s.createdAt)}</span></div>
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
                <Button small variant="danger-outline" icon="x" className="grow" style={{ width: '100%' }} onClick={() => navigate(`/pai/aprovacoes/${s.id}/recusar`)}>Recusar</Button>
                <Button small icon="check" className="grow" style={{ width: '100%' }} disabled={busy === s.id} onClick={async () => { setBusy(s.id); const ok = await run(() => api.approve(s.id)); setBusy(null); if (ok) setOkMsg(`+${s.task?.xp} XP creditados para ${s.child?.name}`); }}>Aprovar</Button>
              </div>
            </div>
          ))}
          <p className="muted t-cap row" style={{ gap: 8 }}><Icon name="info" size={16} /> Ao aprovar, o XP é creditado no saldo do seu filho na hora.</p>
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
  const quick = ['Falta terminar', 'Foto não mostra a tarefa', 'Refaça com mais capricho'];
  if (list && !s) return <div className="screen"><TopBar title="Recusar tarefa" onBack={() => navigate('/pai/aprovacoes')} /><Alert icon="info" title="Já analisada">Esse envio não está mais pendente.</Alert></div>;
  return (
    <div className="screen pad-bottom-actions">
      <TopBar title="Recusar tarefa" onBack={() => navigate('/pai/aprovacoes')} />
      {s && <div className="card row"><div className="tile"><Icon name={s.task?.icon || 'list'} size={22} /></div><div className="col grow" style={{ gap: 0 }}><b className="t-h">{s.task?.title}</b><span className="muted t-cap">{s.child?.name}</span></div></div>}
      <p className="muted">Conte ao seu filho o que precisa melhorar. Ele poderá enviar a tarefa de novo.</p>
      <div className="chips">{quick.map((q) => <Chip key={q} active={reason === q} onClick={() => setReason(q)}>{q}</Chip>)}</div>
      <Field label="Motivo (opcional)"><textarea className="textarea" placeholder="Ex.: Faltou resolver os últimos exercícios." value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="footer-actions">
        <Button variant="danger" disabled={busy} onClick={async () => { setBusy(true); const ok = await run(() => api.reject(id, reason), 'Tarefa recusada. Seu filho foi avisado.'); setBusy(false); if (ok) navigate('/pai/aprovacoes', true); }}>Recusar tarefa</Button>
      </div>
    </div>
  );
}

// ---------- perfil e extras ----------
export function ParentProfile() {
  const [out, setOut] = useState(false);
  const real = getSession()?.mode === 'real';
  const { data: pname } = useData(() => api.parentName());
  const { data: pemail } = useData(() => api.parentEmail());
  const row = (icon: string, label: string, path: string) => (
    <button className="list-item" style={{ padding: '12px 14px' }} onClick={() => navigate(path)}>
      <div className="tile dark" style={{ width: 36, height: 36, borderRadius: 12 }}><Icon name={icon} size={20} /></div>
      <span className="label" style={{ fontSize: 14 }}>{label}</span>
      <Icon name="chevron" size={20} className="dim" />
    </button>
  );
  return (
    <ParentLayout active="perfil">
      <div className="hero" style={{ paddingTop: 8 }}>
        <div className="avatar xl solid" style={{ width: 88, height: 88, fontSize: 37 }}>{(real && pname ? pname[0] : 'R').toUpperCase()}</div>
        <h1 className="t-l">{real && pname ? pname : 'Responsável'}</h1>
        <span className="muted t-cap">{real ? pemail || 'Conta do responsável' : 'seuemail@exemplo.com'}</span>
      </div>
      <div className="card menu" style={{ borderRadius: 16 }}>
        {row('users', 'Membros da família', '/pai/membros')}
        {row('shield', 'Privacidade e consentimento (LGPD)', '/pai/privacidade')}
        {row('chart', 'Relatórios', '/pai/relatorios')}
        {row('info', 'Sobre o money task', '/sobre')}
      </div>
      {!real && <Button variant="outline" icon="refresh" onClick={() => { api.resetDemo(); toast('Demonstração reiniciada.'); }}>Reiniciar dados da demonstração</Button>}
      <Button variant="danger-outline" icon="logout" onClick={() => setOut(true)}>Sair</Button>
      <InstallBanner />
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
  const [busyDel, setBusyDel] = useState(false);
  const [conf, setConf] = useState('');
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
      <TopBar title="Privacidade e consentimento" onBack={() => navigate('/pai/perfil')} />
      <div className="card col">
        <b className="t-h">O que guardamos dos seus filhos</b>
        {['Nome e idade', 'Nome de usuário e senha (protegida)', 'XP, tarefas e resgates'].map((t) => <span key={t} className="row" style={{ gap: 8 }}><span className="mint"><Icon name="check" size={16} /></span> {t}</span>)}
      </div>
      <div className="card tight row" style={{ padding: '12px 14px' }}>
        <span className="mint"><Icon name="shield" size={20} /></span>
        <span className="t-cap">Consentimento dado ao criar a conta.</span>
      </div>
      <Button variant="outline" icon="download" onClick={download}>Baixar meus dados</Button>
      <Button variant="danger-outline" icon="trash" onClick={() => setDel(true)}>Excluir conta e todos os dados</Button>
      <Sheet open={del} onClose={() => setDel(false)}>
        <div className="tile lg danger icon-top"><Icon name="alert" size={26} /></div>
        <h2 className="t-m" style={{ textAlign: 'center' }}>Excluir tudo?</h2>
        <p className="muted t-cap" style={{ textAlign: 'center' }}>Sua conta e os perfis de todos os filhos serão apagados para sempre. Digite EXCLUIR para confirmar.</p>
        <Field label="Confirmação"><TextInput placeholder="EXCLUIR" autoCapitalize="characters" value={conf} onChange={(e) => setConf(e.target.value)} /></Field>
        <Button variant="danger" disabled={busyDel || conf.trim().toUpperCase() !== 'EXCLUIR'} onClick={async () => { setBusyDel(true); const ok = await run(() => api.deleteAccount()); setBusyDel(false); if (ok) navigate('/entrar', true); }}>{busyDel ? 'Excluindo…' : 'Excluir definitivamente'}</Button>
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
          <h2 className="t-s">XP por filho</h2>
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
