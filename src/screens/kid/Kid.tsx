import { useState, type ReactNode } from 'react';
import { api, type KidTask } from '../../lib/api';
import { currentQuery, navigate } from '../../lib/router';
import { levelProgress } from '../../lib/xp';
import { installApp, isIOS, isStandalone, shrinkImage } from '../../lib/pwa';
import { Alert, BottomNav, Button, Chip, Empty, Loading, Progress, Sheet, TopBar, run, toast, useData, deadlineText, deadlineLabel, when, xpText, type NavItem } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import type { Child, Reward } from '../../lib/types';

// ---------- layout com navegação ----------
export function KidLayout({ active, children }: { active: string; children: ReactNode }) {
  const { data: me } = useData(() => api.me());
  const edu = (me?.age ?? 0) >= 16;
  const items: NavItem[] = [
    { key: 'tarefas', label: 'Tarefas', icon: 'list', path: '/filho/tarefas' },
    { key: 'loja', label: 'Loja', icon: 'gift', path: '/filho/loja' },
    { key: 'inicio', label: 'Início', icon: 'home', path: '/filho' },
    edu ? { key: 'aprender', label: 'Aprender', icon: 'book', path: '/filho/aprender' } : { key: 'conquistas', label: 'Conquistas', icon: 'trophy', path: '/filho/conquistas' },
    { key: 'perfil', label: 'Perfil', icon: 'user', path: '/filho/perfil' },
  ];
  return (
    <>
      <div className="screen has-nav">{children}</div>
      <BottomNav items={items} active={active} />
    </>
  );
}

const Initial = ({ c, size }: { c: Child; size?: 'xl' }) => <div className={`avatar ring ${size || ''}`}>{c.name[0].toUpperCase()}</div>;

// ---------- Início ----------
export function KidHome() {
  const { data: me } = useData(() => api.me());
  const { data: tasks } = useData(() => api.myTasks());
  const { data: rewards } = useData(() => api.myRewards());
  const { data: notice } = useData(() => api.nextNotice());
  if (!me || !tasks || !rewards) return <KidLayout active="inicio"><Loading /></KidLayout>;

  const lp = levelProgress(me.lifetime);
  const todo = tasks.filter((t) => t.state === 'todo' || t.state === 'rejected');
  const pending = tasks.filter((t) => t.state === 'pending').length;
  const next = rewards.find((r) => r.cost > me.balance);
  const bigNotice = notice && notice.kind !== 'rejected';
  const bannerNotice = notice && !bigNotice ? notice : null;

  return (
    <KidLayout active="inicio">
      <div className="row between">
        <div className="row">
          <Initial c={me} />
          <div className="col" style={{ gap: 0 }}>
            <h1 className="t-m">Olá, {me.name}!</h1>
            <span className="muted t-cap">Vamos ganhar XP hoje?</span>
          </div>
        </div>
      </div>

      {bannerNotice && (
        <Alert
          variant="destructive"
          icon="alert"
          title={bannerNotice.title}
          action={
            <button className="btn-ghost btn-sm btn" style={{ width: 'auto', color: 'inherit', minHeight: 32 }} onClick={() => api.dismissNotice(bannerNotice.id)} aria-label="Dispensar aviso">
              <Icon name="x" size={16} />
            </button>
          }
        >
          {bannerNotice.text}
        </Alert>
      )}
      {!bannerNotice && pending > 0 && (
        <Alert icon="bell" title={`${pending} ${pending === 1 ? 'tarefa em análise' : 'tarefas em análise'}`}>
          Aguardando aprovação do responsável.
        </Alert>
      )}

      <div className="card row between">
        <div className="col" style={{ gap: 2 }}>
          <span className="muted t-body">Para gastar na loja</span>
          <div>
            <span className="num-xl mint">{me.balance.toLocaleString('pt-BR')}</span> <b className="t-s">XP</b>
          </div>
        </div>
        <div className="xp-bubble" aria-hidden="true">
          XP
        </div>
      </div>

      <div className="card col" style={{ gap: 10 }}>
        <div className="row between">
          <b style={{ fontSize: 15 }}>Nível {lp.level}</b>
          <span className="muted t-cap">Total ganho: {me.lifetime.toLocaleString('pt-BR')} XP</span>
        </div>
        <Progress pct={lp.pct} />
        <span className="muted t-cap">{lp.to ? `Faltam ${lp.missing.toLocaleString('pt-BR')} XP para o Nível ${lp.level + 1}` : 'Você chegou ao nível máximo!'}</span>
      </div>

      <WeekStreak streak={me.streak} lastActive={me.lastActive} />

      <div className="row between">
        <h2 className="t-h">Tarefas de hoje</h2>
        <a className="link" href="#/filho/tarefas">
          Ver todas
        </a>
      </div>
      {todo.length === 0 ? (
        <Empty icon="check" title="Nenhuma tarefa por hoje" text="Peça ao seu responsável para criar novas tarefas." />
      ) : (
        todo.slice(0, 2).map((t) => <TaskRow key={t.task.id} t={t} compact />)
      )}

      {next && (
        <button className="card clickable col" style={{ textAlign: 'left', gap: 8, padding: 12, borderRadius: 12 }} onClick={() => navigate('/filho/loja')}>
          <span className="muted t-cap-s">Próxima recompensa</span>
          <div className="row">
            <div className="tile">
              <Icon name={next.icon} size={22} />
            </div>
            <div className="col grow" style={{ gap: 2 }}>
              <b className="semi" style={{ fontSize: 15 }}>{next.title}</b>
              <Progress small pct={(me.balance / next.cost) * 100} />
              <span className="muted t-cap">
                {me.balance.toLocaleString('pt-BR')} / {next.cost.toLocaleString('pt-BR')} XP
              </span>
            </div>
          </div>
        </button>
      )}

      <NoticeSheet notice={bigNotice ? notice : null} />
    </KidLayout>
  );
}

const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
function dayKeyOf(t: number) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function WeekStreak({ streak, lastActive }: { streak: number; lastActive?: string | null }) {
  const DAY = 86400000;
  const now = Date.now();
  const today = dayKeyOf(now);
  const alive = !!lastActive && (lastActive === today || lastActive === dayKeyOf(now - DAY));
  const marked = new Set<string>();
  if (alive && lastActive) {
    const [y, m, d] = lastActive.split('-').map(Number);
    const base = new Date(y, m - 1, d, 12).getTime();
    for (let i = 0; i < streak; i++) marked.add(dayKeyOf(base - i * DAY));
  }
  const days = Array.from({ length: 7 }, (_, i) => {
    const t = now - (6 - i) * DAY;
    return { key: dayKeyOf(t), label: DOW[new Date(t).getDay()], isToday: i === 6 };
  });
  const shown = alive ? streak : 0;
  return (
    <div className="card col" style={{ gap: 12 }} aria-label="Sequência de dias">
      <div className="row between">
        <div className="row" style={{ gap: 8 }}>
          <span className={`flame ${shown > 0 ? 'on' : ''}`}>
            <Icon name="flame" size={22} />
          </span>
          <b className="t-h">{shown > 0 ? `${shown} ${shown === 1 ? 'dia seguido' : 'dias seguidos'}` : 'Comece sua sequência'}</b>
        </div>
      </div>
      <div className="week">
        {days.map((d) => (
          <div key={d.key} className={`wd ${marked.has(d.key) ? 'done' : ''} ${d.isToday ? 'today' : ''}`}>
            <span className="dot">{marked.has(d.key) ? <Icon name="check" size={14} /> : null}</span>
            <span className="lbl">{d.label}</span>
          </div>
        ))}
      </div>
      <span className="muted t-cap">{shown > 0 && lastActive !== today ? 'Conclua uma tarefa hoje para manter a sequência.' : shown > 0 ? 'Sequência garantida hoje!' : 'Conclua uma tarefa e acenda a chama.'}</span>
    </div>
  );
}

function Confetti() {
  const colors = ['var(--primary)', 'var(--warning)', '#ffffff', '#5ad6ff'];
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i % 6) * 0.08}s`, animationDuration: `${1.4 + (i % 5) * 0.2}s` }} />
      ))}
    </div>
  );
}

function NoticeSheet({ notice }: { notice: { id: string; kind: string; title: string; text: string } | null }) {
  const approved = notice?.kind === 'approved';
  return (
    <Sheet open={!!notice} onClose={() => notice && api.dismissNotice(notice.id)}>
      {notice && (
        <>
          <Confetti />
          <div className="tile lg icon-top pop">
            <Icon name={notice.kind === 'levelup' ? 'star' : approved ? 'check' : 'trophy'} size={30} />
          </div>
          <h2 className="t-m center" style={{ textAlign: 'center' }}>
            {approved ? 'Missão cumprida!' : notice.title}
          </h2>
          {approved ? (
            <p className="mint t-xl center" style={{ textAlign: 'center', margin: 0 }}>
              {notice.text.split(' ').slice(0, 2).join(' ')}
            </p>
          ) : null}
          <p className="muted" style={{ textAlign: 'center' }}>
            {approved ? 'Seu responsável aprovou a tarefa. Continue assim!' : notice.text}
          </p>
          <Button onClick={() => api.dismissNotice(notice.id)}>{approved || notice.kind === 'levelup' ? 'Continuar' : 'Legal!'}</Button>
        </>
      )}
    </Sheet>
  );
}

// ---------- tarefas ----------
function TaskRow({ t, compact }: { t: KidTask; compact?: boolean }) {
  const { task, state } = t;
  const done = state === 'done';
  const open = state === 'todo' || state === 'rejected';
  const late = open && !!task.dueAt && task.dueAt < Date.now();
  return (
    <div className={`card tight col ${compact ? '' : 'bordered'}`} style={{ gap: 10, borderRadius: compact ? 12 : 14, padding: compact ? 12 : 14 }}>
      <div className="row">
        <div className={`tile ${compact ? '' : 'md'} ${done ? 'dark' : ''}`}>
          <Icon name={done ? 'check' : task.icon} size={22} />
        </div>
        <div className="col grow" style={{ gap: 0, minWidth: 0 }}>
          <b className={compact ? 'semi' : 'bold'} style={{ fontSize: 15, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.7 : 1 }}>
            {task.title}
          </b>
          {compact ? <span className="mint t-cap bold">{task.xp} XP</span> : <span className="muted t-cap">{task.description}</span>}
        </div>
        {compact && late && <span className="badge late">Prazo vencido</span>}
        {compact && open && !late && (
          <Button small onClick={() => navigate(`/filho/tarefas/${task.id}`)}>
            Concluir
          </Button>
        )}
      </div>
      {!compact && (
        <div className="row between" style={{ flexWrap: 'wrap' }}>
          <div className="chips">
            {open && task.dueAt && <Chip icon="clock" tone={late ? 'late' : undefined}>{late ? 'Prazo vencido' : deadlineLabel(task.dueAt)}</Chip>}
            <span className="badge">{task.xp} XP</span>
            {open && !!task.penalty && !late && <Chip tone="warn">−{task.penalty} XP se atrasar</Chip>}
          </div>
          {late && <span className="badge late">Sem tempo</span>}
          {!late && state === 'todo' && (
            <Button small onClick={() => navigate(`/filho/tarefas/${task.id}`)}>
              Concluir
            </Button>
          )}
          {!late && state === 'rejected' && (
            <Button small variant="danger-outline" onClick={() => navigate(`/filho/tarefas/${task.id}`)}>
              Refazer
            </Button>
          )}
          {state === 'pending' && <span className="badge warn">Aguardando</span>}
          {done && <span className="badge soft">Feita</span>}
        </div>
      )}
      {!compact && t.partners && (
        <div className="partners" aria-label="Quem faz esta tarefa junto">
          <span className="muted t-cap" style={{ alignSelf: 'center' }}>Conjunta:</span>
          {t.partners.map((p, i) => <Chip key={i} icon={p.done ? 'check' : 'user'} active={p.done}>{p.me ? 'Você' : p.name}{p.done ? ' · feito' : ''}</Chip>)}
        </div>
      )}
    </div>
  );
}

export function KidTasks() {
  const { data: tasks } = useData(() => api.myTasks());
  const { data: week } = useData(() => api.weekStats());
  const [tab, setTab] = useState<'todo' | 'pending' | 'done'>('todo');
  if (!tasks || !week) return <KidLayout active="tarefas"><Loading /></KidLayout>;
  const groups = {
    todo: tasks.filter((t) => t.state === 'todo' || t.state === 'rejected'),
    pending: tasks.filter((t) => t.state === 'pending'),
    done: tasks.filter((t) => t.state === 'done'),
  };
  const list = groups[tab];
  return (
    <KidLayout active="tarefas">
      <div className="col" style={{ gap: 2 }}>
        <h1 className="t-l">Minhas tarefas</h1>
        <span className="muted t-cap">Conclua e ganhe XP</span>
      </div>
      <Alert variant="promo" icon="trophy" title="Meta da semana" action={week.done < week.goal ? <Button small onClick={() => setTab('todo')}>Continuar</Button> : undefined}>
        {week.done >= week.goal ? 'Meta cumprida! Continue assim.' : `Conclua ${week.goal} tarefas e ganhe um bônus de reconhecimento. Feitas: ${week.done}.`}
      </Alert>
      <div className="chips">
        <Chip active={tab === 'todo'} onClick={() => setTab('todo')}>A fazer · {groups.todo.length}</Chip>
        <Chip active={tab === 'pending'} onClick={() => setTab('pending')}>Aguardando · {groups.pending.length}</Chip>
        <Chip active={tab === 'done'} onClick={() => setTab('done')}>Feitas · {groups.done.length}</Chip>
      </div>
      {list.length === 0 ? (
        <Empty icon={tab === 'done' ? 'trophy' : 'list'} title={tab === 'todo' ? 'Nada para fazer agora' : tab === 'pending' ? 'Nada aguardando' : 'Nenhuma tarefa feita ainda'} text={tab === 'todo' ? 'Quando seu responsável criar tarefas, elas aparecem aqui.' : 'Quando houver, elas aparecem aqui.'} />
      ) : (
        list.map((t) => <TaskRow key={t.task.id} t={t} />)
      )}
    </KidLayout>
  );
}

export function KidDoTask({ id }: { id: string }) {
  const { data: t, error } = useData(() => api.myTask(id), [id]);
  const [photo, setPhoto] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  if (error) return <div className="screen"><TopBar title="Tarefa" onBack={() => navigate('/filho/tarefas')} /><Alert variant="destructive" icon="alert" title="Ops">{error}</Alert></div>;
  if (!t) return <div className="screen"><TopBar title="Tarefa" onBack={() => navigate('/filho/tarefas')} /><Loading /></div>;
  const { task, state, submission } = t;

  const pick = async (f?: File | null) => {
    if (!f) return;
    try {
      setPhoto(await shrinkImage(f));
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const send = async () => {
    setBusy(true);
    const ok = await run(() => api.submitTask(id, photo));
    setBusy(false);
    if (ok) navigate(`/filho/tarefas/${id}/enviada`, true);
  };
  const late = (state === 'todo' || state === 'rejected') && !!task.dueAt && task.dueAt < Date.now();
  const locked = state === 'pending' || state === 'done' || late;

  return (
    <div className="screen pad-bottom-actions">
      <TopBar title="Concluir tarefa" onBack={() => navigate('/filho/tarefas')} />
      <div className="card col" style={{ gap: 12 }}>
        <div className="row">
          <div className="tile xl">
            <Icon name={task.icon} size={24} />
          </div>
          <div className="col grow" style={{ gap: 6 }}>
            <b className="t-s">{task.title}</b>
            <div className="chips">
              <span className="badge">{task.xp} XP</span>
              {state === 'rejected' && <span className="badge bad"><Icon name="x" size={14} /> Recusada</span>}
              {task.dueAt && (state === 'todo' || state === 'rejected') && !late && <Chip icon="clock">{deadlineLabel(task.dueAt)}</Chip>}
              {!!task.penalty && !late && (state === 'todo' || state === 'rejected') && <Chip tone="warn">−{task.penalty} XP se atrasar</Chip>}
            </div>
          </div>
        </div>
        {task.description && (
          <div className="col" style={{ gap: 4 }}>
            <span className="t-cap-s semi muted" style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>Descrição</span>
            <span className="t-body">{task.description}</span>
          </div>
        )}
      </div>
      {task.dueAt && (state === 'todo' || state === 'rejected') && late && (
        <Alert variant="destructive" icon="clock" title="Prazo vencido">O prazo desta tarefa acabou em {deadlineText(task.dueAt)}.{task.penalty ? ` Foram descontados até ${task.penalty} XP.` : ''}</Alert>
      )}
      {t.partners && (
        <div className="col" style={{ gap: 8 }}>
          <b className="t-label">Tarefa conjunta</b>
          <div className="partners">{t.partners.map((p, i) => <Chip key={i} icon={p.done ? 'check' : 'user'} active={p.done}>{p.me ? 'Você' : p.name}{p.done ? ' · feito' : ''}</Chip>)}</div>
          <span className="muted t-cap">Cada um ganha o XP ao concluir a sua parte.</span>
        </div>
      )}
      {state === 'rejected' && (
        <Alert variant="destructive" icon={null} title="Recado do seu responsável">
          {submission?.reason || 'Seu responsável pediu para refazer. Pode enviar de novo!'}
        </Alert>
      )}
      {state === 'pending' && <Alert variant="warning" icon="clock" title="Aguardando aprovação">Seu responsável vai conferir em breve.</Alert>}
      {state === 'done' && <Alert variant="success" icon="check" title="Tarefa concluída">Você já ganhou o XP desta tarefa.</Alert>}
      {!locked && (
        <div className="col">
          <div className="row" style={{ gap: 6 }}>
            <b className="semi" style={{ fontSize: 15 }}>Prova da tarefa</b>
            {!task.needsPhoto && <span className="muted t-cap">(opcional)</span>}
          </div>
          {photo ? (
            <>
              <img className="photo" src={photo} alt="Prova da tarefa" />
              <label className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>
                <Icon name="camera" size={16} /> Trocar foto
                <input className="sr" type="file" accept="image/*" capture="environment" onChange={(e) => pick(e.target.files?.[0])} />
              </label>
            </>
          ) : (
            <label className="dropzone" style={{ cursor: 'pointer' }}>
              <Icon name="camera" size={32} />
              <b className="semi" style={{ fontSize: 14, color: 'var(--foreground)' }}>Toque para tirar uma foto</b>
              <span className="t-cap">ou escolher da galeria</span>
              <input className="sr" type="file" accept="image/*" capture="environment" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
          )}
        </div>
      )}
      {!locked && (
        <p className="muted t-cap row" style={{ gap: 8 }}>
          <Icon name="info" size={18} /> Seu responsável vai conferir antes de liberar o XP.
        </p>
      )}
      <div className="footer-actions">
        <Button disabled={locked || busy || (task.needsPhoto && !photo)} onClick={send}>
          {state === 'rejected' ? 'Tentar de novo' : 'Enviar para aprovação'}
        </Button>
      </div>
    </div>
  );
}

export function KidSent({ id }: { id: string }) {
  const { data: t } = useData(() => api.myTask(id), [id]);
  return (
    <div className="screen pad-bottom-actions">
      <div className="hero" style={{ paddingTop: 40 }}>
        <div className="halo">
          <div>
            <Icon name="check" size={56} />
          </div>
        </div>
        <h1 className="t-l">Tarefa enviada!</h1>
        <p className="muted">Seu responsável vai conferir. Quando aprovar, o XP cai direto na sua conta.</p>
      </div>
      {t && (
        <div className="card col">
          <div className="row">
            <div className="tile md">
              <Icon name={t.task.icon} size={22} />
            </div>
            <div className="col grow" style={{ gap: 0 }}>
              <b className="bold" style={{ fontSize: 15 }}>{t.task.title}</b>
              <span className="muted t-cap">Enviada agora</span>
            </div>
            <span className="badge">+{t.task.xp} XP</span>
          </div>
          <hr className="divider" />
          <span className="warn t-cap semi">
            <Icon name="clock" size={14} /> Aguardando aprovação
          </span>
        </div>
      )}
      <div className="footer-actions">
        <Button onClick={() => navigate('/filho/tarefas')}>Ver minhas tarefas</Button>
        <Button variant="outline" onClick={() => navigate('/filho')}>
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}

// ---------- loja ----------
export function KidShop() {
  const { data: me } = useData(() => api.me());
  const { data: rewards } = useData(() => api.myRewards());
  const { data: reds } = useData(() => api.myRedemptions());
  const [tab, setTab] = useState<'loja' | 'resgates'>(currentQuery().get('tab') === 'resgates' ? 'resgates' : 'loja');
  const [sel, setSel] = useState<Reward | null>(null);
  const [busy, setBusy] = useState(false);
  if (!me || !rewards || !reds) return <KidLayout active="loja"><Loading /></KidLayout>;
  const enough = sel ? me.balance >= sel.cost : false;

  const redeem = async () => {
    if (!sel) return;
    setBusy(true);
    const r = sel;
    const ok = await run(() => api.redeem(r.id));
    setBusy(false);
    if (ok) {
      sessionStorage.setItem('mt-redeemed', JSON.stringify({ title: r.title, cost: r.cost, icon: r.icon }));
      setSel(null);
      navigate('/filho/resgatado');
    }
  };

  return (
    <KidLayout active="loja">
      <div className="row between">
        <div className="col" style={{ gap: 2 }}>
          <h1 className="t-l">Loja</h1>
          <span className="muted t-cap">Troque seu XP por prêmios</span>
        </div>
        <span className="badge" style={{ height: 36, padding: '6px 12px', fontSize: 16 }}>
          {me.balance.toLocaleString('pt-BR')} XP
        </span>
      </div>
      <div className="chips">
        <Chip active={tab === 'loja'} onClick={() => setTab('loja')}>Disponíveis</Chip>
        <Chip active={tab === 'resgates'} onClick={() => setTab('resgates')}>Meus resgates</Chip>
      </div>

      {tab === 'loja' ? (
        rewards.length === 0 ? (
          <Empty icon="gift" title="A loja ainda está vazia" text="Seu responsável ainda não criou recompensas." />
        ) : (
          <>
            {(() => {
              const nxt = rewards.find((r) => r.cost > me.balance);
              return nxt ? (
                <Alert variant="promo" icon="gift" title="Falta pouco!" action={<Button small onClick={() => navigate('/filho/tarefas')}>Ganhar XP</Button>}>
                  Ganhe mais {(nxt.cost - me.balance).toLocaleString('pt-BR')} XP e troque pela próxima recompensa.
                </Alert>
              ) : null;
            })()}
            {rewards.map((r) => {
              const ok = me.balance >= r.cost;
              return (
                <div key={r.id} className="card bordered col" style={{ gap: 12, padding: 14, borderRadius: 14 }}>
                  <div className="row">
                    <div className="tile md">
                      <Icon name={r.icon} size={22} />
                    </div>
                    <div className="col grow" style={{ gap: 0 }}>
                      <b className="bold" style={{ fontSize: 15 }}>{r.title}</b>
                      <span className="muted t-cap">{r.description}</span>
                      {r.expiresAt && <span style={{ marginTop: 6 }}><Chip icon="clock" tone="warn">Até {deadlineText(r.expiresAt)}</Chip></span>}
                    </div>
                    <span className="badge">{r.cost.toLocaleString('pt-BR')} XP</span>
                  </div>
                  {ok ? (
                    <Button icon="gift" className="btn-block-sm" onClick={() => setSel(r)}>
                      Resgatar
                    </Button>
                  ) : (
                    <button className="col" style={{ gap: 6, textAlign: 'left' }} onClick={() => setSel(r)}>
                      <Progress small pct={(me.balance / r.cost) * 100} />
                      <span className="dim t-cap">
                        <Icon name="lock" size={14} /> Faltam {(r.cost - me.balance).toLocaleString('pt-BR')} XP
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )
      ) : reds.length === 0 ? (
        <Empty icon="gift" title="Nenhum resgate ainda" text="Quando você trocar XP por um prêmio, ele aparece aqui." />
      ) : (
        reds.map((x) => (
          <div key={x.id} className="card row">
            <div className="tile md">
              <Icon name={x.reward?.icon || 'gift'} size={22} />
            </div>
            <div className="col grow" style={{ gap: 0 }}>
              <b className="t-h">{x.reward?.title || 'Recompensa'}</b>
              <span className="muted t-cap">
                {when(x.createdAt)} · −{x.cost} XP
              </span>
            </div>
            {x.status === 'pending' ? <span className="badge warn"><Icon name="clock" size={14} /> Aguardando</span> : <span className="badge soft"><Icon name="check" size={14} /> Entregue</span>}
          </div>
        ))
      )}

      <Sheet open={!!sel} onClose={() => setSel(null)}>
        {sel && enough && (
          <>
            <div className="tile lg icon-top" style={{ borderRadius: 12 }}>
              <Icon name={sel.icon} size={28} />
            </div>
            <h2 className="t-m" style={{ textAlign: 'center' }}>Resgatar recompensa?</h2>
            <b className="mint semi" style={{ textAlign: 'center', fontSize: 15 }}>{sel.title}</b>
            <div className="col" style={{ background: 'var(--background)', borderRadius: 14, padding: '12px 14px', gap: 10 }}>
              <div className="row between"><span className="muted t-body">Custo</span><b className="semi" style={{ fontSize: 15 }}>{sel.cost.toLocaleString('pt-BR')} XP</b></div>
              <div className="row between"><span className="muted t-body">Saldo atual</span><b className="semi" style={{ fontSize: 15 }}>{me.balance.toLocaleString('pt-BR')} XP</b></div>
              <hr className="divider" />
              <div className="row between"><span className="muted t-body">Saldo depois</span><b className="mint t-h">{(me.balance - sel.cost).toLocaleString('pt-BR')} XP</b></div>
            </div>
            <Button icon="check" disabled={busy} onClick={redeem}>Confirmar resgate</Button>
            <Button variant="outline" onClick={() => setSel(null)}>Cancelar</Button>
          </>
        )}
        {sel && !enough && (
          <>
            <div className="tile lg icon-top mint-on-dark">
              <Icon name="lock" size={28} />
            </div>
            <h2 className="t-m" style={{ textAlign: 'center' }}>Ainda faltam {(sel.cost - me.balance).toLocaleString('pt-BR')} XP</h2>
            <p className="muted" style={{ textAlign: 'center' }}>
              “{sel.title}” custa {sel.cost.toLocaleString('pt-BR')} XP e você tem {me.balance.toLocaleString('pt-BR')}. Complete tarefas para chegar lá!
            </p>
            <Button icon="list" onClick={() => { setSel(null); navigate('/filho/tarefas'); }}>Ver minhas tarefas</Button>
            <Button variant="outline" onClick={() => setSel(null)}>Fechar</Button>
          </>
        )}
      </Sheet>
    </KidLayout>
  );
}

export function KidRedeemed() {
  const r = JSON.parse(sessionStorage.getItem('mt-redeemed') || '{"title":"Recompensa","cost":0,"icon":"gift"}');
  const { data: me } = useData(() => api.me());
  return (
    <div className="screen pad-bottom-actions">
      <div className="hero" style={{ paddingTop: 40 }}>
        <div className="halo">
          <div>
            <Icon name="gift" size={42} />
          </div>
        </div>
        <h1 className="t-l">Resgate feito!</h1>
        <p className="muted">Avisamos seu responsável. Combine com ele quando vai receber o prêmio.</p>
      </div>
      <div className="card col">
        <div className="row">
          <div className="tile md">
            <Icon name={r.icon || 'gift'} size={22} />
          </div>
          <div className="col grow" style={{ gap: 0 }}>
            <b className="bold" style={{ fontSize: 15 }}>{r.title}</b>
            <span className="muted t-cap">−{r.cost} XP</span>
          </div>
        </div>
        <hr className="divider" />
        <div className="row between">
          <span className="muted">Saldo agora</span>
          <b className="mint t-m">{me ? me.balance.toLocaleString('pt-BR') : '…'} XP</b>
        </div>
      </div>
      <div className="footer-actions">
        <Button onClick={() => navigate('/filho/loja?tab=resgates')}>Ver meus resgates</Button>
        <Button variant="outline" onClick={() => navigate('/filho/loja')}>
          Voltar à loja
        </Button>
      </div>
    </div>
  );
}

// ---------- conquistas ----------
const ACH_SUB: Record<string, string> = { first_task: 'Concluída', streak_3: 'Sequência', streak_7: 'Sequência', first_redeem: 'Recompensa', xp_500: 'Meta', study_master: 'Estudos' };
export function KidAchievements() {
  const { data: ach } = useData(() => api.myAchievements());
  const { data: me } = useData(() => api.me());
  if (!ach || !me) return <KidLayout active="conquistas"><Loading /></KidLayout>;
  const lp = levelProgress(me.lifetime);
  const n = ach.filter((a) => a.unlocked).length;
  return (
    <KidLayout active="conquistas">
      <div className="col" style={{ gap: 2 }}>
        <h1 className="t-l">Conquistas</h1>
        <span className="muted t-cap">{n} de {ach.length} desbloqueadas</span>
      </div>
      <div className="card col">
        <div className="row between">
          <b className="t-h">Nível {lp.level}</b>
          <span className="muted t-cap">{me.lifetime.toLocaleString('pt-BR')}{lp.to ? ` / ${lp.to.toLocaleString('pt-BR')}` : ''} XP</span>
        </div>
        <Progress pct={lp.pct} />
      </div>
      <div className="grid2">
        {ach.map((a) => (
          <div key={a.code} className={`card ach ${a.unlocked ? '' : 'locked'}`}>
            <div className="circle">
              <Icon name={a.unlocked ? a.icon : 'lock'} size={26} />
            </div>
            <b className="t-label" style={a.unlocked ? undefined : { color: 'var(--dim)' }}>{a.title}</b>
            <span className={`${a.unlocked ? 'muted' : 'dim'} t-cap-s`}>{a.unlocked ? ACH_SUB[a.code] || 'Desbloqueada' : a.hint}</span>
          </div>
        ))}
      </div>
    </KidLayout>
  );
}

// ---------- perfil ----------
export function KidProfile() {
  const { data: me } = useData(() => api.me());
  const [out, setOut] = useState(false);
  if (!me) return <KidLayout active="perfil"><Loading /></KidLayout>;
  const edu = me.age >= 16;
  const MenuItem = ({ icon, label, path }: { icon: string; label: string; path: string }) => (
    <button className="list-item" onClick={() => navigate(path)}>
      <div className="tile dark" style={{ width: 36, height: 36, borderRadius: 12 }}>
        <Icon name={icon} size={20} />
      </div>
      <span className="label" style={{ fontSize: 15 }}>{label}</span>
      <Icon name="chevron" size={20} className="dim" />
    </button>
  );
  return (
    <KidLayout active="perfil">
      <div className="hero" style={{ paddingTop: 8 }}>
        <Initial c={me} size="xl" />
        <h1 className="t-l">{me.name}</h1>
        <span className="muted t-cap">@{me.username} · {me.age} anos</span>
        <span className="badge"><Icon name="trophy" size={14} /> Nível {me.level}</span>
      </div>
      <div className="card menu">
        <MenuItem icon="list" label="Meu extrato de XP" path="/filho/extrato" />
        <MenuItem icon="gift" label="Meus resgates" path="/filho/loja?tab=resgates" />
        {edu ? <MenuItem icon="trophy" label="Minhas conquistas" path="/filho/conquistas" /> : <MenuItem icon="trophy" label="Minhas conquistas" path="/filho/conquistas" />}
      </div>
      <p className="muted t-cap"><Icon name="info" size={13} /> Para trocar sua senha, peça ao seu responsável.</p>
      <Button variant="danger-outline" icon="logout" onClick={() => setOut(true)}>Sair</Button>
      <InstallBanner />
      <Sheet open={out} onClose={() => setOut(false)}>
        <div className="tile lg icon-top"><Icon name="logout" size={26} /></div>
        <h2 className="t-m" style={{ textAlign: 'center' }}>Sair da conta?</h2>
        <p className="muted t-cap" style={{ textAlign: 'center' }}>Para entrar de novo, use seu usuário e senha.</p>
        <Button variant="danger" onClick={async () => { await api.logout(); navigate('/filho/entrar', true); }}>Sair</Button>
        <Button variant="outline" onClick={() => setOut(false)}>Cancelar</Button>
      </Sheet>
    </KidLayout>
  );
}

export function InstallBanner() {
  const [help, setHelp] = useState(false);
  if (isStandalone()) return null;
  const go = async () => {
    const r = await installApp();
    if (r === 'manual') setHelp(true);
  };
  return (
    <>
      <Alert variant="promo" icon="download" title="Instale o money task" action={<Button small onClick={go}>Instalar</Button>}>
        Adicione à tela inicial e abra como um app.
      </Alert>
      <Sheet open={help} onClose={() => setHelp(false)}>
        <div className="tile lg icon-top"><Icon name="download" size={26} /></div>
        <h2 className="t-m" style={{ textAlign: 'center' }}>Adicionar à tela inicial</h2>
        <p className="muted" style={{ textAlign: 'center' }}>
          {isIOS() ? 'No iPhone: toque em Compartilhar (quadrado com seta) e depois em “Adicionar à Tela de Início”.' : 'No Chrome: abra o menu (⋮) e toque em “Instalar app” ou “Adicionar à tela inicial”.'}
        </p>
        <Button onClick={() => setHelp(false)}>Entendi</Button>
      </Sheet>
    </>
  );
}

export function KidStatement() {
  const { data: led } = useData(() => api.myLedger());
  const { data: me } = useData(() => api.me());
  return (
    <div className="screen">
      <TopBar title="Extrato de XP" onBack={() => navigate('/filho/perfil')} />
      {me && (
        <div className="row" style={{ gap: 12, alignItems: 'stretch' }}>
          <div className="card col grow" style={{ padding: 14, borderRadius: 14, gap: 4 }}>
            <span className="muted t-cap">Saldo atual</span>
            <b className="num-m mint">{me.balance.toLocaleString('pt-BR')} XP</b>
          </div>
          <div className="card col grow" style={{ padding: 14, borderRadius: 14, gap: 4 }}>
            <span className="muted t-cap">Ganhos totais</span>
            <b className="num-m mint">{me.lifetime.toLocaleString('pt-BR')} XP</b>
          </div>
        </div>
      )}
      <h2 className="t-h">Movimentações</h2>
      {!led ? <Loading /> : led.length === 0 ? <Empty icon="list" title="Sem movimentações" text="Seu XP ganho e gasto aparece aqui." /> : (
        <div className="card menu" style={{ padding: '4px 14px' }}>
          {led.map((e) => (
            <div key={e.id} className="list-item" style={{ padding: '12px 0' }}>
              <div className={`tile ${e.delta > 0 ? '' : 'dark'}`} style={{ width: 36, height: 36, borderRadius: 12 }}>
                <Icon name={e.delta > 0 ? 'check' : 'gift'} size={18} />
              </div>
              <div className="col grow" style={{ gap: 0 }}>
                <b className="semi" style={{ fontSize: 15 }}>{e.reason}</b>
                <span className="muted t-cap">{when(e.createdAt)}</span>
              </div>
              <b className={e.delta > 0 ? 'mint' : 'danger'} style={{ fontSize: 16 }}>{e.delta > 0 ? '+' : '−'}{Math.abs(e.delta).toLocaleString('pt-BR')}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

