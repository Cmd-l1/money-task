import { useState } from 'react';
import { api, getSession, sbConfigured } from '../../lib/api';
import { navigate } from '../../lib/router';
import { Alert, Button, Field, PasswordInput, TextInput, TopBar, toast } from '../../ui/kit';
import { Icon } from '../../ui/Icon';

// Contas reais (Supabase) ficam ativas quando o build recebe o endereço e a chave do projeto.
const REAL_ACCOUNTS = sbConfigured;

// Dados do cadastro em andamento (a senha fica só na memória, nunca no armazenamento do navegador).
let signupDraft: { name: string; email: string; pass: string } | null = null;

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
    <div className="screen" style={{ gap: 20 }}>
      <div className="hero" style={{ paddingTop: 32 }}>
        <div className="brand">money task</div>
        <h1 className="t-l">Bem-vindo de volta</h1>
        <p className="muted">Acompanhe a rotina dos seus filhos.</p>
      </div>
      {!REAL_ACCOUNTS && (
        <Alert variant="promo" icon="info" title="Versão de demonstração">
          Os dados reais ainda não estão ativos. Toque em “Explorar modo demonstração” para ver o app completo.
        </Alert>
      )}
      <div className="card col gap-16" style={{ padding: 20 }}>
        {formErr && (
          <Alert variant="destructive" icon="alert" title="Não foi possível entrar">
            {formErr}
          </Alert>
        )}
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
        <Button variant="outline" icon="play" onClick={() => navigate('/demo')}>
          Explorar modo demonstração
        </Button>
        <p className="sep-text">
          Ainda não tem conta? <a href="#/cadastro">Criar conta</a>
        </p>
        <p className="sep-text muted t-cap">
          É filho(a)? <a href="#/filho/entrar">Entrar com usuário e senha</a>
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
    <div className="screen" style={{ gap: 16 }}>
      <div className="hero" style={{ paddingTop: 16 }}>
        <div className="brand">money task</div>
        <h1 className="t-l">Crie sua conta</h1>
        <p className="muted">Cadastro exclusivo para pais e responsáveis.</p>
      </div>
      <div className="card col gap-16" style={{ padding: 20 }}>
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
        <Alert icon="info" title="Seus filhos não criam conta">
          Você cadastra o usuário e a senha deles depois, na aba Membros.
        </Alert>
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
      <TopBar title="Privacidade e consentimento" />
      <div className="card col gap-16">
        <h2 className="t-h">Seus filhos são menores de idade</h2>
        <p className="muted">
          Pela LGPD (Lei nº 13.709/2018), o tratamento de dados de crianças e adolescentes exige o consentimento de um dos pais ou responsável legal. Por isso pedimos sua autorização.
        </p>
        <hr className="divider" />
        <div className="col" style={{ gap: 10 }}>
          <b className="t-label">O que guardamos sobre cada filho</b>
          {['Nome e idade', 'Nome de usuário e senha (protegida)', 'XP, tarefas, fotos de prova e resgates'].map((t) => (
            <div key={t} className="row" style={{ gap: 10 }}>
              <span className="mint"><Icon name="check" size={16} /></span>
              <span className="muted">{t}</span>
            </div>
          ))}
        </div>
        <hr className="divider" />
        <p className="muted t-cap">
          Usamos esses dados só para o app funcionar. Você pode baixar ou excluir tudo quando quiser, em Perfil &gt; Privacidade e dados.
        </p>
      </div>
      <label className="card tight row" style={{ alignItems: 'flex-start', cursor: 'pointer' }}>
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} style={{ width: 22, height: 22, accentColor: '#6ceba8', marginTop: 2 }} />
        <span className="t-body">Sou o responsável legal e autorizo o tratamento dos dados dos meus filhos para o uso do app.</span>
      </label>
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
  const opts = ['Criar bons hábitos', 'Ajudar nas tarefas de casa', 'Ensinar a lidar com dinheiro', 'Incentivar os estudos'];
  const toggle = (o: string) => setSel(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
  return (
    <div className="screen pad-bottom-actions">
      <TopBar title="Seu objetivo" />
      <div className="col">
        <h2 className="t-l">O que você quer com o money task?</h2>
        <p className="muted">Opcional. Ajuda a pesquisa do projeto e não muda o app.</p>
      </div>
      <div className="col">
        {opts.map((o) => (
          <button key={o} className={`option ${sel.includes(o) ? 'selected' : ''}`} onClick={() => toggle(o)}>
            <span className="letter">{sel.includes(o) ? <Icon name="check" size={14} /> : ''}</span>
            {o}
          </button>
        ))}
      </div>
      <div className="footer-actions">
        <Button onClick={() => { onboardGoals = sel; navigate('/sobre-familia'); }}>Continuar</Button>
        <Button variant="ghost" onClick={() => { onboardGoals = []; navigate('/sobre-familia'); }}>
          Pular
        </Button>
      </div>
    </div>
  );
}

export function FamilyInfo() {
  const [n, setN] = useState('');
  return (
    <div className="screen pad-bottom-actions">
      <TopBar title="Sobre sua família" />
      <div className="col">
        <h2 className="t-l">Quantos filhos vão usar o app?</h2>
        <p className="muted">Opcional. Você pode adicionar quantos quiser depois.</p>
      </div>
      <Field label="Quantidade de filhos">
        <TextInput inputMode="numeric" placeholder="Ex.: 2" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, '').slice(0, 2))} />
      </Field>
      <div className="footer-actions">
        <Button onClick={() => { if (getSession()?.mode === 'real') void api.saveOnboarding({ goals: onboardGoals, kids_expected: n || null }); navigate('/pronto'); }}>Continuar</Button>
        <Button variant="ghost" onClick={() => { if (getSession()?.mode === 'real' && onboardGoals.length) void api.saveOnboarding({ goals: onboardGoals }); navigate('/pronto'); }}>
          Pular
        </Button>
      </div>
    </div>
  );
}

export function AllSet() {
  return (
    <div className="screen pad-bottom-actions">
      <div className="hero" style={{ paddingTop: 80 }}>
        <div className="halo">
          <div>
            <Icon name="check" size={44} />
          </div>
        </div>
        <h1 className="t-l">Tudo pronto!</h1>
        <p className="muted">Sua conta está criada. Agora adicione o primeiro membro da família.</p>
      </div>
      {!(REAL_ACCOUNTS && getSession()?.mode === 'real') && (
        <Alert variant="warning" icon="info" title="Contas reais em breve">
          Nesta versão, o cadastro ainda não é gravado. Explore a demonstração para ver como tudo funciona.
        </Alert>
      )}
      <div className="footer-actions">
        {REAL_ACCOUNTS && getSession()?.mode === 'real' ? (
          <Button icon="plus" onClick={() => navigate('/pai/membros/novo', true)}>Adicionar primeiro membro</Button>
        ) : (
          <>
            <Button onClick={() => navigate('/demo')}>Explorar a demonstração</Button>
            <Button variant="outline" onClick={() => navigate('/entrar')}>
              Voltar ao login
            </Button>
          </>
        )}
        {REAL_ACCOUNTS && getSession()?.mode === 'real' && <Button variant="ghost" onClick={() => navigate('/pai', true)}>Ir para o início</Button>}
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
      <TopBar title="Esqueci minha senha" />
      <div className="col">
        <h2 className="t-l">Vamos redefinir sua senha</h2>
        <p className="muted">Digite o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
      </div>
      <Field label="E-mail" error={err}>
        <TextInput type="email" inputMode="email" placeholder="seuemail@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!err} />
      </Field>
      <Alert icon="info" title="Seu filho esqueceu a senha?">
        Ele não recebe link: você redefine em Membros &gt; Editar membro.
      </Alert>
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
            <Icon name="mail" size={40} />
          </div>
        </div>
        <h1 className="t-l">Confira seu e-mail</h1>
        <p className="muted">
          {REAL_ACCOUNTS ? <>Se existir uma conta com <b>{email}</b>, enviamos um link para criar uma nova senha. Ele vale por 1 hora. Veja também a caixa de spam.</> : <>Enviaríamos o link para <b>{email}</b>. Ele valeria por 1 hora.</>}
        </p>
      </div>
      {!REAL_ACCOUNTS && (
        <Alert variant="warning" icon="info" title="Recurso das contas reais">
          O envio de e-mails será ativado junto com as contas reais.
        </Alert>
      )}
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
    <div className="screen" style={{ gap: 20 }}>
      <div className="row between" style={{ paddingTop: 24 }}>
        <h1 className="t-xl">Pronto para ganhar XP?</h1>
        <div className="xp-bubble">XP</div>
      </div>
      <div className="card col gap-16" style={{ padding: 20 }}>
        {error && (
          <Alert variant="destructive" icon="alert" title="Não foi possível entrar">
            {error}
          </Alert>
        )}
        <Field label="Usuário">
          <TextInput autoCapitalize="none" autoCorrect="off" autoComplete="username" placeholder="ex.: lucas14" value={u} onChange={(e) => setU(e.target.value)} invalid={!!error} />
        </Field>
        <Field label="Senha">
          <PasswordInput autoComplete="current-password" placeholder="Sua senha" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </Field>
        <Button disabled={busy} onClick={submit}>{busy ? 'Entrando…' : 'Entrar'}</Button>
        <p className="sep-text muted t-cap">Seu usuário e senha foram criados pelo seu responsável. Esqueceu? Peça a ele para redefinir.</p>
        <Alert variant="promo" icon="info" title="Testando a demonstração?">
          Use <b>lucas14</b> e senha <b>lucas123</b> (14 anos) ou <b>pedro17</b> e <b>pedro123</b> (17 anos, com educação financeira).
        </Alert>
        <p className="sep-text muted t-cap">
          É pai, mãe ou responsável? <a href="#/entrar">Entrar aqui</a>
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
      <p className="muted">Escolha como explorar o app. Os dados são fictícios e ficam só neste aparelho.</p>
      <Item icon="user" title="Entrar como responsável" sub="Veja aprovações, tarefas e membros." onClick={() => go('parent')} />
      <Item icon="gamepad" title="Entrar como filho · 9 anos" sub="Tarefas, loja e conquistas." onClick={() => go('kid', 'c-mari')} />
      <Item icon="book" title="Entrar como filho · 17 anos" sub="Inclui a trilha de educação financeira." onClick={() => go('kid', 'c-pedro')} />
      <Alert variant="promo" icon="star" title="Gostou do money task?">
        <span>Crie sua conta grátis e acompanhe a rotina de verdade com seus filhos.</span>
        <span style={{ display: 'block', marginTop: 10 }}>
          <Button small onClick={() => navigate('/cadastro')}>
            Criar conta grátis
          </Button>
        </span>
      </Alert>
    </div>
  );
}

export function About() {
  return (
    <div className="screen">
      <TopBar title="Sobre o money task" />
      <div className="hero">
        <div className="xp-bubble">XP</div>
        <h2 className="t-l">money task</h2>
        <p className="muted">Tarefas, XP e educação financeira para famílias.</p>
      </div>
      <div className="card col">
        <p className="muted">Projeto de conclusão de curso (Design, FURB). Pais criam tarefas e recompensas, e os filhos ganham XP ao concluir e trocam por prêmios combinados em família.</p>
        <hr className="divider" />
        <div className="row-kv"><span className="muted">Versão</span><b>{import.meta.env.VITE_APP_VERSION || 'dev'}</b></div>
        <div className="row-kv"><span className="muted">Faixa etária</span><b>7 a 18 anos</b></div>
      </div>
      <p className="muted t-cap center" style={{ textAlign: 'center' }}>
        Conteúdo de educação financeira baseado em materiais do Banco Central (Cidadania Financeira), ANBIMA Educação e ENEF. É material educativo, não recomendação de investimento.
      </p>
    </div>
  );
}
