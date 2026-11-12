import { useState, type CSSProperties, type ReactNode } from 'react';
import { api, getSession, sbConfigured } from '../../lib/api';
import { navigate } from '../../lib/router';
import { Alert, Button, Chip, Field, PasswordInput, Sheet, TextInput, TopBar, toast } from '../../ui/kit';
import { Icon } from '../../ui/Icon';

// Contas reais (Supabase) ficam ativas quando o build recebe o endereço e a chave do projeto.
const REAL_ACCOUNTS = sbConfigured;

// Dados do cadastro em andamento (a senha fica só na memória, nunca no armazenamento do navegador).
let signupDraft: { name: string; email: string; pass: string } | null = null;

// Cartão colado na base da tela (como no Figma): raio 24 só no topo, sem margem lateral.
const sheetCard: CSSProperties = { margin: 0, borderRadius: '24px 24px 0 0', borderWidth: '1px 0 0', padding: '24px 20px calc(env(safe-area-inset-bottom) + 32px)', marginTop: 'auto' };
const flushScreen: CSSProperties = { padding: 0, gap: 0 };
const linkWhite: CSSProperties = { fontWeight: 600, color: 'var(--foreground)', fontSize: 13 };

// Faixa de erro só com a mensagem (sem título).
function ErrorStrip({ children }: { children: ReactNode }) {
  return (
    <div className="alert destructive" role="alert" style={{ padding: '12px 14px' }}>
      <span className="alert-icon"><Icon name="alert" size={18} /></span>
      <div className="alert-body"><span className="alert-desc">{children}</span></div>
    </div>
  );
}

// Indicador de progresso em pílulas (passo atual mais largo).
function Steps({ active, total = 3 }: { active: number; total?: number }) {
  return (
    <div className="row" style={{ gap: 6, justifyContent: 'center' }} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} style={{ display: 'block', height: 6, width: i === active ? 28 : 10, borderRadius: 3, background: i === active ? 'var(--primary)' : 'var(--secondary)' }} />
      ))}
    </div>
  );
}

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export function ParentLogin() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState<{ email?: string; pass?: string }>({});

  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');

  const submit = async () => {
    const e: typeof err = {};
    if (!emailOk(email)) e.email = 'Digite um e-mail válido.';
    if (pass.length < 1) e.pass = 'Digite sua senha.';
    setErr(e);
    setFormErr('');
    if (Object.keys(e).length) return;
    if (!REAL_ACCOUNTS) {
      toast('Contas reais ainda não estão ativas. Explore a demonstração.', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.loginParent(email, pass);
      navigate('/pai', true);
    } catch (x) {
      setFormErr(x instanceof Error ? x.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen" style={flushScreen}>
      <div className="hero" style={{ padding: 'calc(env(safe-area-inset-top) + 48px) 20px 24px' }}>
        <div className="brand">money task</div>
        <h1 className="t-l">Bem-vindo de volta</h1>
        <p className="muted">Acompanhe a rotina dos seus filhos.</p>
      </div>
      <div className="card col gap-16" style={sheetCard}>
        {formErr && <ErrorStrip>{formErr}</ErrorStrip>}
        <Field label="E-mail" error={err.email}>
          <TextInput type="email" inputMode="email" autoComplete="email" placeholder="seuemail@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!err.email} />
        </Field>
        <Field label="Senha" error={err.pass}>
          <PasswordInput autoComplete="current-password" placeholder="Sua senha" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </Field>
        <a className="link" href="#/esqueci" style={{ textAlign: 'right' }}>
          Esqueci minha senha
        </a>
        <Button disabled={busy} onClick={submit}>{busy ? 'Entrando…' : 'Entrar'}</Button>
        <Button variant="outline" icon="play" onClick={() => navigate('/demo')} style={{ fontSize: 14 }}>
          Explorar modo demonstração
        </Button>
        <p className="sep-text" style={linkWhite}>
          Ainda não tem conta? <a href="#/cadastro" style={{ color: 'inherit' }}>Criar conta</a>
        </p>
        <p className="sep-text muted t-cap">
          É filho(a)? <a href="#/filho/entrar" style={{ color: 'inherit' }}>Entrar com usuário e senha</a>
        </p>
      </div>
    </div>
  );
}

export function ParentSignup() {
  const [f, setF] = useState({ name: '', email: '', pass: '', pass2: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  const submit = () => {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = 'Informe seu nome.';
    if (!emailOk(f.email)) e.email = 'Digite um e-mail válido.';
    if (f.pass.length < 8) e.pass = 'A senha precisa de no mínimo 8 caracteres.';
    if (f.pass2 !== f.pass) e.pass2 = 'As senhas não coincidem.';
    setErr(e);
    if (Object.keys(e).length) return;
    signupDraft = { name: f.name.trim(), email: f.email.trim(), pass: f.pass };
    navigate('/lgpd');
  };

  return (
    <div className="screen" style={flushScreen}>
      <div className="hero" style={{ padding: 'calc(env(safe-area-inset-top) + 24px) 20px 20px' }}>
        <div className="brand">money task</div>
        <h1 className="t-l">Crie sua conta</h1>
        <p className="muted">Cadastro exclusivo para pais e responsáveis.</p>
      </div>
      <div className="card col gap-16" style={sheetCard}>
        <Field label="Nome completo" error={err.name}>
          <TextInput autoComplete="name" placeholder="Seu nome" value={f.name} onChange={(e) => set('name', e.target.value)} invalid={!!err.name} />
        </Field>
        <Field label="E-mail" error={err.email}>
          <TextInput type="email" inputMode="email" autoComplete="email" placeholder="seuemail@exemplo.com" value={f.email} onChange={(e) => set('email', e.target.value)} invalid={!!err.email} />
        </Field>
        <Field label="Senha" error={err.pass}>
          <PasswordInput autoComplete="new-password" placeholder="Mínimo de 8 caracteres" value={f.pass} onChange={(e) => set('pass', e.target.value)} />
        </Field>
        <Field label="Confirmar senha" error={err.pass2}>
          <PasswordInput autoComplete="new-password" placeholder="Repita a senha" value={f.pass2} onChange={(e) => set('pass2', e.target.value)} />
        </Field>
        <Button onClick={submit}>Continuar</Button>
        <p className="sep-text" style={linkWhite}>
          Já tem conta? <a href="#/entrar" style={{ color: 'inherit' }}>Entrar</a>
        </p>
        <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
          <span className="mint" style={{ flex: 'none', marginTop: 1 }}><Icon name="info" size={16} /></span>
          <span className="t-cap muted">Seus filhos não criam conta: você cadastra o usuário e a senha deles depois, na aba Membros.</span>
        </div>
      </div>
    </div>
  );
}

export function Consent() {
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const accept = async () => {
    setErr('');
    if (!REAL_ACCOUNTS) return navigate('/objetivo');
    if (!signupDraft) return navigate('/cadastro', true);
    setBusy(true);
    try {
      const r = await api.signupParent({ name: signupDraft.name, email: signupDraft.email, password: signupDraft.pass });
      signupDraft = null;
      navigate(r.confirm ? '/confirme-email' : '/objetivo', true);
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Não foi possível criar a conta.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="screen pad-bottom-actions">
      <div className="hero" style={{ paddingTop: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--card)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
          <Icon name="shield" size={36} />
        </div>
        <h1 className="t-l">Privacidade dos seus filhos</h1>
        <p className="muted">Para criar perfis de crianças e adolescentes, precisamos do seu consentimento (LGPD, art. 14).</p>
      </div>
      <div className="card col" style={{ gap: 12 }}>
        {[
          'Guardamos só nome, idade e usuário do seu filho.',
          'Não pedimos e-mail, foto ou localização.',
          'Só você vê e altera os dados e a senha dele.',
          'Você pode apagar o perfil a qualquer momento.',
        ].map((t) => (
          <div key={t} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <span className="mint" style={{ flex: 'none', marginTop: 1 }}><Icon name="check" size={16} /></span>
            <span className="t-cap">{t}</span>
          </div>
        ))}
      </div>
      <div className="row" style={{ alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setOk(!ok)}>
        <button
          type="button"
          role="checkbox"
          aria-checked={ok}
          aria-label="Li e concordo"
          onClick={(e) => { e.stopPropagation(); setOk(!ok); }}
          style={{ width: 22, height: 22, borderRadius: 6, flex: 'none', display: 'grid', placeItems: 'center', background: ok ? 'var(--primary)' : 'transparent', border: ok ? '1.5px solid var(--primary)' : '1.5px solid var(--dim)', color: 'var(--primary-foreground)' }}
        >
          {ok && <Icon name="check" size={14} />}
        </button>
        <span className="t-cap">Li e concordo com a Política de Privacidade e sou o responsável legal pelos perfis que vou criar.</span>
      </div>
      {err && (
        <Alert variant="destructive" icon="alert" title="Não foi possível criar a conta">
          {err} <a href="#/cadastro">Voltar ao cadastro</a>
        </Alert>
      )}
      <div className="footer-actions">
        <Button disabled={!ok || busy} onClick={accept}>
          {busy ? 'Criando sua conta…' : 'Aceitar e continuar'}
        </Button>
      </div>
    </div>
  );
}

let onboardGoals: string[] = [];
export function Goal() {
  const [sel, setSel] = useState<string[]>([]);
  const opts: { t: string; icon: string }[] = [
    { t: 'Hábitos de estudo', icon: 'book' },
    { t: 'Tarefas de casa', icon: 'home' },
    { t: 'Cuidados pessoais', icon: 'heart' },
    { t: 'Educação financeira', icon: 'coin' },
  ];
  const toggle = (o: string) => setSel(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
  return (
    <div className="screen pad-bottom-actions">
      <div style={{ paddingTop: 8 }}><Steps active={0} /></div>
      <div className="col">
        <h2 className="t-l">O que você quer incentivar?</h2>
        <p className="muted">Escolha quantos quiser. Vamos sugerir tarefas e recompensas com base nisso.</p>
      </div>
      <div className="col" style={{ gap: 12 }}>
        {opts.map((o) => {
          const on = sel.includes(o.t);
          return (
            <button key={o.t} className={`option ${on ? 'selected' : ''}`} onClick={() => toggle(o.t)} aria-pressed={on}>
              <span className="tile" style={{ width: 40, height: 40 }}><Icon name={o.icon} size={20} /></span>
              <span className="grow">{o.t}</span>
              {on && <span className="mint"><Icon name="check" size={20} /></span>}
            </button>
          );
        })}
      </div>
      <p className="t-cap-s dim" style={{ textAlign: 'center' }}>Essas perguntas são opcionais e ajudam na pesquisa do projeto.</p>
      <div className="footer-actions">
        <Button onClick={() => { onboardGoals = sel; navigate('/sobre-familia'); }}>Continuar</Button>
        <Button variant="ghost" style={{ color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 600 }} onClick={() => { onboardGoals = []; navigate('/sobre-familia'); }}>
          Pular por agora
        </Button>
      </div>
    </div>
  );
}

function ChipGroup({ label, opts, value, onChange }: { label: string; opts: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="col" style={{ gap: 8 }}>
      <b className="t-h" style={{ fontSize: 15 }}>{label}</b>
      <div className="chips">
        {opts.map((o) => (
          <Chip key={o} active={value === o} onClick={() => onChange(value === o ? '' : o)}>{o}</Chip>
        ))}
      </div>
    </div>
  );
}

export function FamilyInfo() {
  const [n, setN] = useState('');
  const [age, setAge] = useState('');
  const [edu, setEdu] = useState('');
  const save = (full: boolean) => {
    if (getSession()?.mode !== 'real') return;
    const data: Record<string, unknown> = {};
    if (onboardGoals.length) data.goals = onboardGoals;
    if (full) {
      if (n) data.kids_expected = n === '4+' ? '4' : n;
      if (age) data.age_range = age;
      if (edu) data.education = edu;
    }
    if (Object.keys(data).length) void api.saveOnboarding(data);
  };
  return (
    <div className="screen pad-bottom-actions">
      <div style={{ paddingTop: 8 }}><Steps active={1} /></div>
      <div className="col">
        <h2 className="t-l">Sobre sua família</h2>
        <p className="muted">Opcional. Usamos para sugerir tarefas e para a pesquisa do projeto.</p>
      </div>
      <ChipGroup label="Quantos filhos?" opts={['1', '2', '3', '4+']} value={n} onChange={setN} />
      <ChipGroup label="Faixa etária" opts={['7–10', '11–15', '16–18']} value={age} onChange={setAge} />
      <ChipGroup label="Escolaridade" opts={['Médio', 'Superior', 'Pós']} value={edu} onChange={setEdu} />
      <p className="t-cap-s dim" style={{ textAlign: 'center' }}>Nenhum dado pessoal é compartilhado. Pode pular.</p>
      <div className="footer-actions">
        <Button onClick={() => { save(true); navigate('/pronto'); }}>Continuar</Button>
        <Button variant="ghost" style={{ color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 600 }} onClick={() => { save(false); navigate('/pronto'); }}>
          Pular por agora
        </Button>
      </div>
    </div>
  );
}

export function AllSet() {
  const real = REAL_ACCOUNTS && getSession()?.mode === 'real';
  const steps: { icon: string; t: string; sub: string; to: string }[] = [
    { icon: 'users', t: '1. Adicione seu filho', sub: 'Cadastre o usuário e a senha dele.', to: '/pai/membros/novo' },
    { icon: 'list', t: '2. Crie tarefas', sub: 'Defina o que vale XP.', to: '/pai/tarefas/nova' },
    { icon: 'gift', t: '3. Crie recompensas', sub: 'Escolha prêmios para trocar por XP.', to: '/pai/recompensas/nova' },
  ];
  return (
    <div className="screen pad-bottom-actions">
      <div className="hero" style={{ paddingTop: 32 }}>
        <div className="halo">
          <div>
            <Icon name="check" size={44} />
          </div>
        </div>
        <h1 className="t-l">Tudo pronto!</h1>
        <p className="muted">Siga estes 3 passos para começar:</p>
      </div>
      <div className="col" style={{ gap: 12 }}>
        {steps.map((st) => (
          <button key={st.t} className="card tight clickable row" style={{ textAlign: 'left', width: '100%' }} disabled={!real} onClick={() => navigate(st.to, true)}>
            <span className="tile"><Icon name={st.icon} size={22} /></span>
            <span className="col grow" style={{ gap: 0 }}>
              <b className="t-h" style={{ fontSize: 15 }}>{st.t}</b>
              <span className="muted t-cap">{st.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="footer-actions">
        {real ? (
          <Button onClick={() => navigate('/pai', true)}>Ir para o início</Button>
        ) : (
          <>
            <Button onClick={() => navigate('/demo')}>Explorar a demonstração</Button>
            <Button variant="outline" onClick={() => navigate('/entrar')}>
              Voltar ao login
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function Forgot() {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="screen pad-bottom-actions">
      <TopBar title="Recuperar senha" />
      <p className="muted">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
      <Field label="E-mail" error={err}>
        <TextInput type="email" inputMode="email" placeholder="seuemail@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!err} />
      </Field>
      <p className="t-cap dim">A senha do seu filho não é recuperada por e-mail. Você mesmo a redefine em Membros.</p>
      <div className="footer-actions">
        <Button
          disabled={busy}
          onClick={async () => {
            if (!emailOk(email)) return setErr('Digite um e-mail válido.');
            setErr('');
            sessionStorage.setItem('mt-reset-email', email.trim());
            if (REAL_ACCOUNTS) {
              setBusy(true);
              try {
                await api.forgotPassword(email);
              } catch (x) {
                setBusy(false);
                return setErr(x instanceof Error ? x.message : 'Não foi possível enviar o e-mail.');
              }
              setBusy(false);
            }
            navigate('/esqueci/enviado');
          }}
        >
          {busy ? 'Enviando…' : 'Enviar link'}
        </Button>
      </div>
    </div>
  );
}

export function ForgotSent() {
  const email = sessionStorage.getItem('mt-reset-email') || 'seuemail@exemplo.com';
  return (
    <div className="screen pad-bottom-actions">
      <div className="hero" style={{ paddingTop: 80 }}>
        <div className="halo" style={{ width: 140, height: 140 }}>
          <div style={{ width: 96, height: 96 }}>
            <Icon name="mail" size={40} />
          </div>
        </div>
        <h1 className="t-l">Confira seu e-mail</h1>
        <p className="muted">
          Enviamos o link para <b>{email}</b>. Ele vale por 1 hora.
        </p>
      </div>
      <div className="footer-actions">
        <Button
          variant="outline"
          onClick={async () => {
            if (!REAL_ACCOUNTS) return toast('Link reenviado (simulação).');
            try {
              await api.forgotPassword(email);
              toast('Link reenviado.');
            } catch (x) {
              toast(x instanceof Error ? x.message : 'Não foi possível reenviar.', 'error');
            }
          }}
        >
          Reenviar link
        </Button>
        <Button onClick={() => navigate('/entrar')}>Voltar ao login</Button>
      </div>
    </div>
  );
}

export function ChildLogin() {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setError('');
    if (!u.trim() || !p) return setError('Digite seu usuário e sua senha.');
    setBusy(true);
    try {
      await api.loginChild(u, p);
      navigate('/filho', true);
    } catch (x) {
      const m = x instanceof Error ? x.message : '';
      setError(/conex|servidor|Muitas/.test(m) ? m : 'Usuário ou senha incorretos. Confira com seu responsável.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="screen" style={flushScreen}>
      <div className="row between" style={{ padding: 'calc(env(safe-area-inset-top) + 40px) 20px 24px' }}>
        <h1 className="t-xl">Pronto para ganhar XP?</h1>
        <div className="xp-bubble">XP</div>
      </div>
      <div className="card col gap-16" style={sheetCard}>
        {error && <ErrorStrip>{error}</ErrorStrip>}
        <Field label="Usuário">
          <TextInput autoCapitalize="none" autoCorrect="off" autoComplete="username" placeholder="ex.: lucas14" value={u} onChange={(e) => setU(e.target.value)} invalid={!!error} style={error ? { borderWidth: 1.5 } : undefined} />
        </Field>
        <Field label="Senha">
          <PasswordInput autoComplete="current-password" placeholder="••••••••" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} style={error ? { border: '1.5px solid var(--destructive)' } : undefined} />
        </Field>
        <Button disabled={busy} onClick={submit}>{busy ? 'Entrando…' : 'Entrar'}</Button>
        <p className="sep-text muted t-cap">Seu usuário e senha foram criados pelo seu responsável. Esqueceu? Peça a ele para redefinir.</p>
        <p className="sep-text muted t-cap">
          É pai, mãe ou responsável? <a href="#/entrar" style={{ color: 'inherit', fontWeight: 600 }}>Entrar aqui</a>
        </p>
      </div>
    </div>
  );
}

export function ConfirmEmail() {
  return (
    <div className="screen pad-bottom-actions">
      <div className="hero" style={{ paddingTop: 80 }}>
        <div className="halo">
          <div>
            <Icon name="mail" size={40} />
          </div>
        </div>
        <h1 className="t-l">Confirme seu e-mail</h1>
        <p className="muted">Enviamos um link de confirmação para o seu e-mail. Toque nele para ativar a conta e depois entre aqui. Veja também a caixa de spam.</p>
      </div>
      <div className="footer-actions">
        <Button onClick={() => navigate('/entrar')}>Ir para o login</Button>
      </div>
    </div>
  );
}

export function NewPassword() {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (p1.length < 8) return setErr('A senha precisa de no mínimo 8 caracteres.');
    if (p1 !== p2) return setErr('As senhas não coincidem.');
    setErr('');
    setBusy(true);
    try {
      await api.setNewPassword(p1);
      toast('Senha alterada.');
      navigate('/pai', true);
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="screen pad-bottom-actions">
      <TopBar title="Nova senha" onBack={() => navigate('/entrar')} />
      <div className="col">
        <h2 className="t-l">Crie uma nova senha</h2>
        <p className="muted">Use pelo menos 8 caracteres.</p>
      </div>
      {err && <Alert variant="destructive" icon="alert" title="Atenção">{err}</Alert>}
      <Field label="Nova senha">
        <PasswordInput autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} />
      </Field>
      <Field label="Confirmar nova senha">
        <PasswordInput autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} />
      </Field>
      <div className="footer-actions">
        <Button disabled={busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar nova senha'}</Button>
      </div>
    </div>
  );
}

export function DemoPicker() {
  const go = async (role: 'parent' | 'kid', childId?: string) => {
    api.startDemo(role, childId);
    navigate(role === 'parent' ? '/pai' : '/filho', true);
  };
  const Item = ({ icon, title, sub, onClick }: { icon: string; title: string; sub: string; onClick: () => void }) => (
    <button className="card clickable row" style={{ textAlign: 'left', width: '100%' }} onClick={onClick}>
      <div className="tile lg">
        <Icon name={icon} size={26} />
      </div>
      <div className="col grow" style={{ gap: 2 }}>
        <b className="t-h">{title}</b>
        <span className="muted t-cap">{sub}</span>
      </div>
      <Icon name="chevron" size={18} className="dim" />
    </button>
  );
  return (
    <div className="screen">
      <TopBar title="Modo demonstração" onBack={() => navigate('/entrar')} />
      <p className="muted">Escolha como explorar o app. Os dados são fictícios e nada é salvo.</p>
      <Item icon="user" title="Entrar como responsável" sub="Veja aprovações, tarefas e membros." onClick={() => go('parent')} />
      <Item icon="gamepad" title="Entrar como filho · 9 anos" sub="Tarefas, loja e conquistas." onClick={() => go('kid', 'c-mari')} />
      <Item icon="book" title="Entrar como filho · 17 anos" sub="Inclui a trilha de educação financeira." onClick={() => go('kid', 'c-pedro')} />
      <Alert variant="promo" icon="star" title="Gostou do money task?">
        <span>Crie sua conta grátis e acompanhe a rotina de verdade com seus filhos.</span>
        <span style={{ display: 'block', marginTop: 10 }}>
          <Button onClick={() => navigate('/cadastro')}>
            Criar conta grátis
          </Button>
        </span>
      </Alert>
    </div>
  );
}

export function About() {
  const [doc, setDoc] = useState<'privacy' | 'terms' | null>(null);
  const rows: { k: 'privacy' | 'terms'; t: string }[] = [
    { k: 'privacy', t: 'Política de Privacidade' },
    { k: 'terms', t: 'Termos de uso' },
  ];
  return (
    <div className="screen">
      <TopBar title="Sobre o money task" />
      <div className="hero">
        <div className="brand">money task</div>
        <span className="muted t-cap">Versão {import.meta.env.VITE_APP_VERSION || '1.0'}</span>
        <p className="muted">Um app para transformar a rotina da família em jogo: tarefas viram XP e o XP vira recompensa, com educação financeira para os mais velhos.</p>
        <span className="dim t-cap">Projeto de TCC · Design · FURB</span>
      </div>
      <div className="card menu">
        {rows.map((r) => (
          <button key={r.k} className="list-item" onClick={() => setDoc(r.k)}>
            <span className="label">{r.t}</span>
            <Icon name="chevron" size={18} className="chev" />
          </button>
        ))}
      </div>
      <p className="muted t-cap center" style={{ textAlign: 'center' }}>
        Conteúdo de educação financeira baseado em materiais do Banco Central (Cidadania Financeira), ANBIMA Educação e ENEF. É material educativo, não recomendação de investimento.
      </p>
      <Sheet open={doc !== null} onClose={() => setDoc(null)}>
        <h3 className="t-m">{doc === 'privacy' ? 'Política de Privacidade' : 'Termos de uso'}</h3>
        {doc === 'privacy' ? (
          <div className="col muted t-cap" style={{ gap: 10 }}>
            <p>Guardamos só o necessário: nome, idade, usuário e senha (protegida) dos membros, além de XP, tarefas, fotos de prova e resgates.</p>
            <p>Não pedimos e-mail, foto de perfil ou localização dos filhos. Só o responsável vê e altera os dados e a senha deles.</p>
            <p>Você pode baixar ou excluir todos os dados quando quiser, em Perfil &gt; Privacidade e dados.</p>
          </div>
        ) : (
          <div className="col muted t-cap" style={{ gap: 10 }}>
            <p>O money task é um projeto acadêmico (TCC de Design, FURB) que ajuda famílias a organizar tarefas e recompensas.</p>
            <p>O cadastro é exclusivo para pais e responsáveis, que respondem pelos perfis que criam. O conteúdo de educação financeira é educativo e não é recomendação de investimento.</p>
          </div>
        )}
        <Button onClick={() => setDoc(null)}>Fechar</Button>
      </Sheet>
    </div>
  );
}
