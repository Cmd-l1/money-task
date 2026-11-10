import { useState } from 'react';
import { api, getSession, sbConfigured } from '../../lib/api';
import { navigate } from '../../lib/router';
import { Button, Field, PasswordInput, Steps, TextInput, TopBar, Alert, toast } from '../../ui/kit';
import { Icon } from '../../ui/Icon';

// Contas reais (Supabase) ficam ativas quando o build recebe o endereço e a chave do projeto.
const REAL_ACCOUNTS = sbConfigured;

// Dados do cadastro em andamento (a senha fica só na memória, nunca no armazenamento do navegador).
let signupDraft: { name: string; email: string; pass: string } | null = null;

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** Aviso de erro compacto (uma linha), como no Figma. */
const ErrorPill = ({ children }: { children: string }) => (
  <div className="alert destructive compact" role="alert">
    <span className="alert-icon">
      <Icon name="alert" size={18} />
    </span>
    <span className="alert-title">{children}</span>
  </div>
);

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
    <div className="screen" style={{ padding: 0, gap: 0 }}>
      <div className="hero" style={{ padding: 'calc(env(safe-area-inset-top) + 40px) 24px 24px' }}>
        <div className="brand" style={{ fontWeight: 700 }}>money task</div>
        <h1 className="t-l" style={{ lineHeight: '32px' }}>Bem-vindo de volta</h1>
        <p className="muted t-body">Acompanhe a rotina dos seus filhos.</p>
      </div>
      <div className="grow" />
      <div className="sheet-panel">
        {formErr && <ErrorPill>{formErr}</ErrorPill>}
        <Field label="E-mail" error={err.email}>
          <TextInput type="email" inputMode="email" autoComplete="email" placeholder="seuemail@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!err.email} />
        </Field>
        <Field label="Senha" error={err.pass}>
          <PasswordInput autoComplete="current-password" placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </Field>
        <a className="link" href="#/esqueci" style={{ textAlign: 'right' }}>
          Esqueci minha senha
        </a>
        <Button disabled={busy} onClick={submit}>{busy ? 'Entrando…' : 'Entrar'}</Button>
        <Button variant="outline" icon="play" onClick={() => navigate('/demo')}>
          Explorar modo demonstração
        </Button>
        <p className="sep-text">
          <a className="link-plain" href="#/cadastro">Ainda não tem conta? Criar conta</a>
        </p>
        <p className="sep-text muted t-cap">
          <a className="muted" href="#/filho/entrar">É filho(a)? Entrar com usuário e senha</a>
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
    <div className="screen" style={{ padding: 0, gap: 0 }}>
      <div className="hero" style={{ padding: 'calc(env(safe-area-inset-top) + 16px) 24px 20px' }}>
        <div className="brand" style={{ fontWeight: 700 }}>money task</div>
        <h1 className="t-l" style={{ lineHeight: '32px' }}>Crie sua conta</h1>
        <p className="muted t-body">Cadastro exclusivo para pais e responsáveis.</p>
      </div>
      <div className="grow" />
      <div className="sheet-panel">
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
        <p className="sep-text">
          Já tem conta? <a href="#/entrar">Entrar</a>
        </p>
        <p className="muted t-cap row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <Icon name="info" size={16} /> Seus filhos não criam conta: você cadastra o usuário e a senha deles depois, na aba Membros.
        </p>
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
    <div className="screen" style={{ gap: 16 }}>
      <div className="col center" style={{ gap: 12, paddingTop: 24 }}>
        <div className="tile" style={{ width: 80, height: 80, borderRadius: 40, background: 'var(--card)', color: 'var(--primary)' }}>
          <Icon name="shield" size={40} />
        </div>
        <h1 className="t-l">Privacidade dos seus filhos</h1>
        <p className="muted t-body">Para criar perfis de crianças e adolescentes, precisamos do seu consentimento (LGPD, art. 14).</p>
      </div>
      <div className="card col" style={{ gap: 12 }}>
        {['Guardamos só nome, idade e usuário do seu filho.', 'Não pedimos e-mail, foto ou localização.', 'Só você vê e altera os dados e a senha dele.', 'Você pode apagar o perfil a qualquer momento.'].map((t) => (
          <div key={t} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <span className="mint"><Icon name="check" size={18} /></span>
            <span className="t-cap">{t}</span>
          </div>
        ))}
      </div>
      <button type="button" role="checkbox" aria-checked={ok} className="row" style={{ alignItems: 'flex-start', textAlign: 'left', gap: 12 }} onClick={() => setOk(!ok)}>
        <span className={`check-box ${ok ? 'on' : ''}`}>{ok && <Icon name="check" size={14} />}</span>
        <span className="muted t-cap" style={{ lineHeight: '18px' }}>Li e concordo com a Política de Privacidade e sou o responsável legal pelos perfis que vou criar.</span>
      </button>
      {err && (
        <Alert variant="destructive" icon="alert" title="Não foi possível criar a conta">
          {err} <a href="#/cadastro">Voltar ao cadastro</a>
        </Alert>
      )}
      <Button disabled={!ok || busy} onClick={accept}>
        {busy ? 'Criando sua conta…' : 'Aceitar e continuar'}
      </Button>
    </div>
  );
}

let onboardGoals: string[] = [];
export function Goal() {
  const [sel, setSel] = useState<string[]>([]);
  const opts: { label: string; icon: string }[] = [
    { label: 'Hábitos de estudo', icon: 'list' },
    { label: 'Tarefas de casa', icon: 'home' },
    { label: 'Cuidados pessoais', icon: 'heart' },
    { label: 'Educação financeira', icon: 'chart' },
  ];
  const toggle = (o: string) => setSel(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
  return (
    <div className="screen" style={{ gap: 16 }}>
      <Steps step={0} total={3} />
      <div className="col" style={{ gap: 6 }}>
        <h1 className="t-l">O que você quer incentivar?</h1>
        <p className="muted t-body">Escolha quantos quiser. Vamos sugerir tarefas e recompensas com base nisso.</p>
      </div>
      <div className="col" style={{ gap: 12 }}>
        {opts.map((o) => {
          const on = sel.includes(o.label);
          return (
            <button key={o.label} className={`opt-card ${on ? 'on' : ''}`} onClick={() => toggle(o.label)} aria-pressed={on}>
              <span className="tile" style={{ borderRadius: 12 }}><Icon name={o.icon} size={22} /></span>
              <span className="t">{o.label}</span>
              {on && <span className="mint"><Icon name="check" size={20} /></span>}
            </button>
          );
        })}
      </div>
      <p className="t-cap dim">Essas perguntas são opcionais e ajudam na pesquisa do projeto.</p>
      <div className="grow" />
      <Button onClick={() => { onboardGoals = sel; navigate('/sobre-familia'); }}>Continuar</Button>
      <button className="link" style={{ color: 'var(--muted-foreground)', textAlign: 'center' }} onClick={() => { onboardGoals = []; navigate('/sobre-familia'); }}>
        Pular por agora
      </button>
    </div>
  );
}

export function FamilyInfo() {
  const [kids, setKids] = useState('');
  const [ages, setAges] = useState('');
  const [school, setSchool] = useState('');
  const group = (label: string, opts: string[], v: string, set: (x: string) => void) => (
    <div className="col" style={{ gap: 8 }}>
      <span className="ch-label">{label}</span>
      <div className="chips">
        {opts.map((o) => (
          <button key={o} type="button" className={`chip ${v === o ? 'active' : ''}`} aria-pressed={v === o} onClick={() => set(v === o ? '' : o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
  const save = (all: boolean) => {
    if (getSession()?.mode === 'real') {
      const d: Record<string, unknown> = {};
      if (onboardGoals.length) d.goals = onboardGoals;
      if (all) {
        if (kids) d.kids_expected = kids;
        if (ages) d.kids_ages = ages;
        if (school) d.schooling = school;
      }
      if (Object.keys(d).length) void api.saveOnboarding(d);
    }
    navigate('/pronto');
  };
  return (
    <div className="screen" style={{ gap: 16 }}>
      <Steps step={1} total={3} />
      <div className="col" style={{ gap: 6 }}>
        <h1 className="t-l">Sobre sua família</h1>
        <p className="muted t-body">Opcional. Usamos para sugerir tarefas e para a pesquisa do projeto.</p>
      </div>
      {group('Quantos filhos?', ['1', '2', '3', '4+'], kids, setKids)}
      {group('Faixa etária dos filhos', ['7–10', '11–15', '16–18'], ages, setAges)}
      {group('Escolaridade', ['Médio', 'Superior', 'Pós'], school, setSchool)}
      <p className="t-cap dim">Nenhum dado pessoal é compartilhado. Pode pular.</p>
      <div className="grow" />
      <Button onClick={() => save(true)}>Continuar</Button>
      <button className="link" style={{ color: 'var(--muted-foreground)', textAlign: 'center' }} onClick={() => save(false)}>
        Pular por agora
      </button>
    </div>
  );
}

export function AllSet() {
  const real = REAL_ACCOUNTS && getSession()?.mode === 'real';
  const steps = [
    { icon: 'users', t: '1. Adicione seu filho', d: 'Crie nome, usuário e senha dele.' },
    { icon: 'list', t: '2. Crie tarefas', d: 'Defina quantos XP cada uma vale.' },
    { icon: 'gift', t: '3. Crie recompensas', d: 'Escolha o que o XP pode comprar.' },
  ];
  return (
    <div className="screen" style={{ gap: 16 }}>
      <Steps step={2} total={3} />
      <div className="col" style={{ gap: 6 }}>
        <h1 className="t-l">Tudo pronto!</h1>
        <p className="muted t-body">Siga estes 3 passos para começar:</p>
      </div>
      {steps.map((s) => (
        <div key={s.t} className="card row" style={{ padding: 14, borderRadius: 14 }}>
          <div className="tile md"><Icon name={s.icon} size={22} /></div>
          <div className="col" style={{ gap: 0 }}>
            <b className="bold" style={{ fontSize: 15 }}>{s.t}</b>
            <span className="muted t-cap">{s.d}</span>
          </div>
        </div>
      ))}
      <div className="grow" />
      {real ? (
        <Button onClick={() => navigate('/pai', true)}>Ir para o início</Button>
      ) : (
        <>
          <p className="muted t-cap row" style={{ gap: 8 }}><Icon name="info" size={16} /> Contas reais em breve: por enquanto, explore a demonstração.</p>
          <Button onClick={() => navigate('/demo')}>Explorar a demonstração</Button>
        </>
      )}
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
      <p className="muted t-body">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
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
        <div className="halo">
          <div>
            <Icon name="mail" size={44} />
          </div>
        </div>
        <h1 className="t-l">Confira seu e-mail</h1>
        <p className="muted t-body" style={{ maxWidth: 300 }}>Enviamos o link para {email}. Ele vale por 1 hora.</p>
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
    <div className="screen" style={{ padding: 0, gap: 0 }}>
      <div className="row between" style={{ padding: 'calc(env(safe-area-inset-top) + 40px) 37px 24px' }}>
        <h1 className="t-xl" style={{ lineHeight: '42px', letterSpacing: 0 }}>Pronto para<br />ganhar XP?</h1>
        <div className="xp-bubble">XP</div>
      </div>
      <div className="grow" />
      <div className="sheet-panel" style={{ padding: '33px' }}>
        {error && <ErrorPill>{error}</ErrorPill>}
        <Field label="Usuário">
          <TextInput autoCapitalize="none" autoCorrect="off" autoComplete="username" placeholder="ex.: lucas14" value={u} onChange={(e) => setU(e.target.value)} invalid={!!error} />
        </Field>
        <Field label="Senha">
          <PasswordInput autoComplete="current-password" placeholder="••••••••" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} invalid={!!error} />
        </Field>
        <Button disabled={busy} onClick={submit}>{busy ? 'Entrando…' : 'Entrar'}</Button>
        <p className="sep-text muted t-cap">Seu usuário e senha foram criados pelo seu responsável. Esqueceu? Peça a ele para redefinir.</p>
        <p className="sep-text t-cap row" style={{ justifyContent: 'center', gap: 6 }}>
          <span className="muted">É pai, mãe ou responsável?</span> <a className="link" href="#/entrar">Entrar aqui</a>
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
    <button className="card clickable row" style={{ textAlign: 'left', width: '100%', padding: 14, borderRadius: 14 }} onClick={onClick}>
      <div className="tile md">
        <Icon name={icon} size={22} />
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
      <p className="muted t-body">Escolha como explorar o app. Os dados são fictícios e nada é salvo.</p>
      <Item icon="user" title="Entrar como responsável" sub="Veja aprovações, tarefas e membros." onClick={() => go('parent')} />
      <Item icon="gamepad" title="Entrar como filho · 9 anos" sub="Tarefas, loja e conquistas." onClick={() => go('kid', 'c-mari')} />
      <Item icon="book" title="Entrar como filho · 17 anos" sub="Inclui a trilha de educação financeira." onClick={() => go('kid', 'c-pedro')} />
      <div className="alert promo stack">
        <div className="alert-body">
          <span className="alert-title">Gostou do money task?</span>
          <span className="alert-desc">Crie sua conta grátis e acompanhe a rotina de verdade com seus filhos.</span>
        </div>
        <Button className="btn-block-sm" onClick={() => navigate('/cadastro')}>
          Criar conta grátis
        </Button>
      </div>
    </div>
  );
}

export function About() {
  return (
    <div className="screen">
      <TopBar title="Sobre o money task" />
      <div className="hero" style={{ gap: 10 }}>
        <div className="brand" style={{ fontWeight: 700 }}>money task</div>
        <span className="muted t-cap">Versão {import.meta.env.VITE_APP_VERSION || '1.0'}</span>
        <p className="muted t-body" style={{ maxWidth: 320 }}>
          Um app para transformar a rotina da família em jogo: tarefas viram XP e o XP vira recompensa, com educação financeira para os mais velhos.
        </p>
        <b className="t-label">Projeto de TCC · Design · FURB</b>
      </div>
      <div className="card menu">
        <button className="list-item" onClick={() => navigate('/politica')}>
          <span className="label" style={{ fontSize: 15 }}>Política de Privacidade</span>
          <Icon name="chevron" size={20} className="dim" />
        </button>
        <button className="list-item" onClick={() => navigate('/termos')}>
          <span className="label" style={{ fontSize: 15 }}>Termos de uso</span>
          <Icon name="chevron" size={20} className="dim" />
        </button>
      </div>
      <p className="dim t-cap-s center" style={{ textAlign: 'center' }}>
        Conteúdo de educação financeira baseado em materiais do Banco Central (Cidadania Financeira), ANBIMA Educação e ENEF. É material educativo, não recomendação de investimento.
      </p>
    </div>
  );
}

export function LegalPage({ kind }: { kind: 'politica' | 'termos' }) {
  const politica = kind === 'politica';
  const blocks: [string, string][] = politica
    ? [
        ['O que guardamos', 'Nome, idade e usuário dos perfis das crianças e adolescentes, além de tarefas, XP, fotos de prova e resgates. Do responsável guardamos nome e e-mail.'],
        ['O que não pedimos', 'Não pedimos e-mail, foto de perfil nem localização das crianças e adolescentes.'],
        ['Quem vê os dados', 'Só o responsável vê e altera os dados e a senha dos perfis que criou.'],
        ['Seus direitos (LGPD)', 'Você pode baixar ou apagar todos os dados a qualquer momento, em Perfil > Privacidade e consentimento.'],
      ]
    : [
        ['Para quem é', 'O money task é voltado a famílias. A conta é criada por um responsável legal, e crianças e adolescentes usam perfis criados por ele.'],
        ['Como usar', 'As recompensas são combinadas em família. O app não processa pagamentos nem entrega prêmios.'],
        ['Educação financeira', 'O conteúdo é educativo e não é recomendação de investimento.'],
        ['Projeto acadêmico', 'O app é um projeto de conclusão de curso (Design, FURB) e pode mudar ao longo do desenvolvimento.'],
      ];
  return (
    <div className="screen">
      <TopBar title={politica ? 'Política de Privacidade' : 'Termos de uso'} onBack={() => navigate('/sobre')} />
      {blocks.map(([t, d]) => (
        <div key={t} className="card col" style={{ gap: 6 }}>
          <b className="t-h">{t}</b>
          <p className="muted t-body">{d}</p>
        </div>
      ))}
    </div>
  );
}
