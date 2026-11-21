import { useState } from 'react';
import { api, getSession } from '../lib/api';
import { currentQuery, navigate } from '../lib/router';
import { Button, useData } from './kit';
import { Icon } from './Icon';
import type { Session } from '../lib/types';

// Onboarding: carrossel curto, mostrado uma vez no primeiro acesso e sempre disponível em Perfil > Rever tutorial.

const key = (s: Session) => `mt-onboarding-${s.mode}-${s.role}-${s.childId || 'pai'}`;
export function seenOnboarding(s: Session): boolean {
  try {
    return localStorage.getItem(key(s)) === '1';
  } catch {
    return true; // sem armazenamento: não insiste
  }
}
function markSeen(s: Session) {
  try {
    localStorage.setItem(key(s), '1');
  } catch {
    /* ignore */
  }
}
export const tutorialPath = (role: 'parent' | 'kid') => (role === 'parent' ? '/pai/tutorial' : '/filho/tutorial');

type Slide = { icon: string; title: string; text: string };
const REVIEW: Slide = { icon: 'info', title: 'Quer rever depois?', text: 'Este tutorial fica guardado. Para vê-lo de novo, abra Perfil e toque em “Rever tutorial”.' };

const PARENT: Slide[] = [
  { icon: 'users', title: 'Bem-vindo ao money task', text: 'Comece cadastrando os membros da família em Membros. Cada um ganha usuário e senha próprios.' },
  { icon: 'list', title: 'Crie tarefas com XP', text: 'Defina título, XP, prazo e repetição. Se quiser, peça uma foto como prova de que foi feito.' },
  { icon: 'gift', title: 'Aprove e recompense', text: 'Aprove as tarefas enviadas para liberar o XP. Em Loja, crie recompensas que os membros trocam por XP.' },
  REVIEW,
];
const KID: Slide[] = [
  { icon: 'star', title: 'Bem-vindo ao money task', text: 'Aqui as tarefas do dia viram XP. Quanto mais você faz, mais sobe de nível.' },
  { icon: 'check', title: 'Conclua suas tarefas', text: 'Abra uma tarefa, marque como feita e, se for pedido, envie uma foto. Seu responsável aprova e o XP entra.' },
  { icon: 'gift', title: 'Troque XP por prêmios', text: 'Na Loja, escolha uma recompensa combinada com seu responsável e troque seu XP por ela.' },
];
const KID_EDU: Slide = { icon: 'book', title: 'Aprenda sobre dinheiro', text: 'Na aba Aprender, faça lições curtas e provas de educação financeira e ganhe XP extra.' };

export function Onboarding({ role }: { role: 'parent' | 'kid' }) {
  const s = getSession();
  const { data: me } = useData(async () => (role === 'kid' ? await api.me() : null));
  const [i, setI] = useState(0);
  const fromProfile = currentQuery().get('de') === 'perfil';
  if (!s) return null;
  if (role === 'kid' && !me) return <div className="screen" />;

  const slides = role === 'parent' ? PARENT : [...KID, ...(me && me.age >= 16 ? [KID_EDU] : []), REVIEW];
  const last = i === slides.length - 1;
  const home = role === 'parent' ? '/pai' : '/filho';
  const profile = role === 'parent' ? '/pai/perfil' : '/filho/perfil';
  const finish = () => {
    markSeen(s);
    navigate(fromProfile ? profile : home, true);
  };
  const sl = slides[i];
  return (
    <div className="screen onb">
      <div className="row between">
        <span className="muted t-cap">{i + 1} de {slides.length}</span>
        {!last && <button className="onb-skip" onClick={finish}>Pular</button>}
      </div>
      <div className="onb-body" key={i}>
        <div className="tile lg onb-icon"><Icon name={sl.icon} size={30} /></div>
        <h1 className="t-l">{sl.title}</h1>
        <p className="muted onb-text">{sl.text}</p>
      </div>
      <div className="onb-dots" aria-hidden="true">
        {slides.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}
      </div>
      <div className="col" style={{ gap: 8 }}>
        <Button onClick={() => (last ? finish() : setI(i + 1))}>{last ? (fromProfile ? 'Concluir' : 'Começar') : 'Próximo'}</Button>
        {i > 0 && <Button variant="ghost" onClick={() => setI(i - 1)}>Voltar</Button>}
      </div>
    </div>
  );
}
