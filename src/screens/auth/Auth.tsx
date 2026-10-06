import { useState } from 'react';
import { api } from '../../lib/api';
import { navigate } from '../../lib/router';
import { Alert, Button, Field, PasswordInput, TextInput, TopBar, toast } from '../../ui/kit';
import { Icon } from '../../ui/Icon';

// Contas reais (Supabase) entram na próxima etapa. Enquanto isso, a demonstração mostra todo o app.
const REAL_ACCOUNTS = false;

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export function ParentLogin() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState<{ email?: string; pass?: string }>({});

  const submit = () => {
    const e: typeof err = {};
    if (!emailOk(email)) e.email = 'Digite um e-mail válido.';
    if (pass.length < 1) e.pass = 'Digite sua senha.';
    setErr(e);
    if (Object.keys(e).length) return;
    if (!REAL_ACCOUNTS) {
      toast('Contas reais ainda não estão ativas. Explore a demonstração.', 'error');
      return;
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
        <Field label="E-mail" error={err.email}>
          <TextInput type="email" inputMode="email" autoComplete="email" placeholder="seuemail@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!err.email} />
        </Field>
        <Field label="Senha" error={err.pass}>
          <PasswordInput autoComplete="current-password" placeholder="Sua senha" value={pass} onChange={(e) => setPass(e.target.value)} />
        </Field>
        <a className="link" href="#/esqueci" style={{ textAlign: 'right' }}>
          Esqueci minha senha
        </a>
        <Button onClick={submit}>Entrar</Button>
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
    sessionStorage.setItem('mt-signup', JSON.stringify({ name: f.name.trim(), email: f.email.trim() }));
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
      <div className="footer-actions">
        <Button disabled={!ok} onClick={() => navigate('/objetivo')}>
          Aceitar e continuar
        </Button>
      </div>
    </div>
  );
}

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
        <Button onClick={() => navigate('/sobre-familia')}>Continuar</Button>
        <Button variant="ghost" onClick={() => navigate('/sobre-familia')}>
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
        <Button onClick={() => navigate('/pronto')}>Continuar</Button>
        <Button variant="ghost" onClick={() => navigate('/pronto')}>
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
      <Alert variant="warning" icon="info" title="Contas reais em breve">
        Nesta versão, o cadastro ainda não é gravado. Explore a demonstração para ver como tudo funciona.
      </Alert>
      <div className="footer-actions">
        <Button onClick={() => navigate('/demo')}>Explorar a demonstração</Button>
        <Button variant="outline" onClick={() => navigate('/entrar')}>
          Voltar ao login
        </Button>
      </div>
    </div>
  );
}

export function Forgot() {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
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
          onClick={() => {
            if (!emailOk(email)) return setErr('Digite um e-mail válido.');
            sessionStorage.setItem('mt-reset-email', email.trim());
            navigate('/esqueci/enviado');
          }}
        >
          Enviar link
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
          Enviaríamos o link para <b>{email}</b>. Ele valeria por 1 hora.
        </p>
      </div>
      <Alert variant="warning" icon="info" title="Recurso das contas reais">
        O envio de e-mails será ativado junto com as contas reais.
      </Alert>
      <div className="footer-actions">
        <Button variant="outline" onClick={() => toast('Link reenviado (simulação).')}>
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
  const submit = async () => {
    setError('');
    if (!u.trim() || !p) return setError('Digite seu usuário e sua senha.');
    try {
      api.loginChild(u, p);
      navigate('/filho', true);
    } catch {
      setError('Usuário ou senha incorretos. Confira com seu responsável.');
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
        <Button onClick={submit}>Entrar</Button>
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
