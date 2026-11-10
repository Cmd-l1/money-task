import { useState } from 'react';
import { navigate } from '../../lib/router';
import { Button, Steps } from '../../ui/kit';
import { Icon } from '../../ui/Icon';

const KEY = 'mt-intro-visto';

/** A introdução já foi vista neste aparelho? */
export function introSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* sem armazenamento: a introdução só aparece de novo na próxima visita */
  }
}

const SLIDES: { icon: string; title: string; text: string }[] = [
  { icon: 'coin', title: 'Bem-vindo ao money task', text: 'Aqui a rotina da família vira um jogo: tarefas viram XP e o XP vira recompensa.' },
  { icon: 'list', title: 'Quem combina é o responsável', text: 'Você cria as tarefas e as recompensas, define quantos XP cada uma vale e aprova o que seus filhos enviam.' },
  { icon: 'trophy', title: 'Quem faz, ganha', text: 'Seu filho conclui tarefas, manda uma foto como prova, ganha XP, sobe de nível e desbloqueia conquistas.' },
  { icon: 'gift', title: 'Troque XP por prêmios', text: 'O XP vira recompensas combinadas em família. Para quem tem 16 anos ou mais, ainda tem trilha de educação financeira.' },
];

export function Intro() {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];
  const finish = () => {
    markSeen();
    navigate('/entrar', true);
  };
  return (
    <div className="ob" aria-live="polite">
      <div className="row between" style={{ minHeight: 40 }}>
        <Steps step={i} total={SLIDES.length} />
        {!last && (
          <button className="link" style={{ color: 'var(--muted-foreground)' }} onClick={finish}>
            Pular
          </button>
        )}
      </div>
      <div className="ob-art">
        <div className="halo">
          <div>
            <Icon name={s.icon} size={64} />
          </div>
        </div>
      </div>
      <div className="col center" style={{ gap: 10 }}>
        <h1 className="t-l">{s.title}</h1>
        <p className="muted t-body" style={{ maxWidth: 320 }}>{s.text}</p>
      </div>
      <div className="col" style={{ gap: 10 }}>
        <Button onClick={() => (last ? finish() : setI(i + 1))}>{last ? 'Começar' : 'Continuar'}</Button>
        {i > 0 ? (
          <Button variant="ghost" onClick={() => setI(i - 1)}>
            Voltar
          </Button>
        ) : (
          <div style={{ minHeight: 48 }} />
        )}
      </div>
    </div>
  );
}
