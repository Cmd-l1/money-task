import { useEffect, useState, useSyncExternalStore, type ReactElement } from 'react';
import { api, getSession, getVersion, subscribe } from './lib/api';
import { matchRoute, navigate, usePath, type Params } from './lib/router';
import { ToastHost } from './ui/kit';
import { About, AllSet, ChildLogin, Consent, DemoPicker, FamilyInfo, Forgot, ForgotSent, Goal, ParentLogin, ParentSignup } from './screens/auth/Auth';
import { KidAchievements, KidDoTask, KidHome, KidProfile, KidRedeemed, KidSent, KidShop, KidStatement } from './screens/kid/Kid';
import { Learn, Lesson, Quiz, QuizResultScreen, Review } from './screens/kid/Learn';
import { AddMember, Approvals, EditMember, FollowChild, Members, ParentHome, ParentProfile, ParentRewards, ParentTasks, Privacy, Reject, Reports, RewardForm, TaskForm } from './screens/parent/Parent';

type Access = 'public' | 'parent' | 'kid';
const ROUTES: { path: string; access: Access; render: (p: Params) => ReactElement }[] = [
  { path: '/entrar', access: 'public', render: () => <ParentLogin /> },
  { path: '/cadastro', access: 'public', render: () => <ParentSignup /> },
  { path: '/lgpd', access: 'public', render: () => <Consent /> },
  { path: '/objetivo', access: 'public', render: () => <Goal /> },
  { path: '/sobre-familia', access: 'public', render: () => <FamilyInfo /> },
  { path: '/pronto', access: 'public', render: () => <AllSet /> },
  { path: '/esqueci', access: 'public', render: () => <Forgot /> },
  { path: '/esqueci/enviado', access: 'public', render: () => <ForgotSent /> },
  { path: '/filho/entrar', access: 'public', render: () => <ChildLogin /> },
  { path: '/demo', access: 'public', render: () => <DemoPicker /> },
  { path: '/sobre', access: 'public', render: () => <About /> },

  { path: '/pai', access: 'parent', render: () => <ParentHome /> },
  { path: '/pai/membros', access: 'parent', render: () => <Members /> },
  { path: '/pai/membros/novo', access: 'parent', render: () => <AddMember /> },
  { path: '/pai/membros/:id', access: 'parent', render: (p) => <FollowChild id={p.id} /> },
  { path: '/pai/membros/:id/editar', access: 'parent', render: (p) => <EditMember id={p.id} /> },
  { path: '/pai/tarefas', access: 'parent', render: () => <ParentTasks /> },
  { path: '/pai/tarefas/nova', access: 'parent', render: () => <TaskForm /> },
  { path: '/pai/tarefas/:id', access: 'parent', render: (p) => <TaskForm id={p.id} /> },
  { path: '/pai/recompensas', access: 'parent', render: () => <ParentRewards /> },
  { path: '/pai/recompensas/nova', access: 'parent', render: () => <RewardForm /> },
  { path: '/pai/recompensas/:id', access: 'parent', render: (p) => <RewardForm id={p.id} /> },
  { path: '/pai/aprovacoes', access: 'parent', render: () => <Approvals /> },
  { path: '/pai/aprovacoes/:id/recusar', access: 'parent', render: (p) => <Reject id={p.id} /> },
  { path: '/pai/perfil', access: 'parent', render: () => <ParentProfile /> },
  { path: '/pai/privacidade', access: 'parent', render: () => <Privacy /> },
  { path: '/pai/relatorios', access: 'parent', render: () => <Reports /> },

  { path: '/filho', access: 'kid', render: () => <KidHome /> },
  { path: '/filho/tarefas', access: 'kid', render: () => <KidTaskList /> },
  { path: '/filho/tarefas/:id', access: 'kid', render: (p) => <KidDoTask id={p.id} /> },
  { path: '/filho/tarefas/:id/enviada', access: 'kid', render: (p) => <KidSent id={p.id} /> },
  { path: '/filho/loja', access: 'kid', render: () => <KidShop /> },
  { path: '/filho/resgatado', access: 'kid', render: () => <KidRedeemed /> },
  { path: '/filho/conquistas', access: 'kid', render: () => <KidAchievements /> },
  { path: '/filho/perfil', access: 'kid', render: () => <KidProfile /> },
  { path: '/filho/extrato', access: 'kid', render: () => <KidStatement /> },
  { path: '/filho/aprender', access: 'kid', render: () => <Learn /> },
  { path: '/filho/aprender/:slug/prova', access: 'kid', render: (p) => <Quiz slug={p.slug} /> },
  { path: '/filho/aprender/:slug/resultado', access: 'kid', render: (p) => <QuizResultScreen slug={p.slug} /> },
  { path: '/filho/aprender/:slug/revisar', access: 'kid', render: (p) => <Review slug={p.slug} /> },
  { path: '/filho/aprender/:slug/:i', access: 'kid', render: (p) => <Lesson slug={p.slug} idx={parseInt(p.i, 10) || 0} /> },
];
import { KidTasks as KidTaskList } from './screens/kid/Kid';

export function App() {
  const path = usePath();
  useSyncExternalStore(subscribe, getVersion);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const s = getSession();
  let content: ReactElement | null = null;
  let redirect: string | null = null;

  if (path === '/' || path === '') redirect = s ? (s.role === 'parent' ? '/pai' : '/filho') : '/entrar';
  else {
    for (const r of ROUTES) {
      const m = matchRoute(r.path, path);
      if (!m) continue;
      if (r.access === 'parent' && s?.role !== 'parent') redirect = '/entrar';
      else if (r.access === 'kid' && s?.role !== 'kid') redirect = '/filho/entrar';
      else content = r.render(m);
      break;
    }
    if (!content && !redirect) redirect = '/';
  }
  useEffect(() => {
    if (redirect) navigate(redirect, true);
  }, [redirect]);

  return (
    <div className="app">
      {!online && <div className="offline-bar">Sem conexão. Alguns recursos podem não funcionar.</div>}
      {s?.mode === 'demo' && (
        <div className="demo-bar">
          <span>Modo demonstração · dados fictícios</span>
          <button onClick={() => { api.logout(); navigate('/entrar', true); }}>Sair</button>
        </div>
      )}
      {content}
      <ToastHost />
    </div>
  );
}
