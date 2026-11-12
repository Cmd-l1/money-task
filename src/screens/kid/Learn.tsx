import { useState } from 'react';
import { api } from '../../lib/api';
import { navigate } from '../../lib/router';
import { MODULE_XP, PASS_RATIO } from '../../lib/xp';
import { Alert, Button, Loading, Progress, Sheet, TopBar, run, useData } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { KidLayout } from './Kid';
import type { QuizResult } from '../../lib/types';

export function Learn() {
  const { data: mods } = useData(() => api.modules());
  const [locked, setLocked] = useState<string | null>(null);
  if (!mods) return <KidLayout active="aprender"><Loading /></KidLayout>;
  const done = mods.filter((m) => m.state === 'done').length;
  const current = mods.find((m) => m.state === 'current');
  const prev = (order: number) => mods.find((m) => m.order === order - 1);
  return (
    <KidLayout active="aprender">
      <div className="col" style={{ gap: 2 }}>
        <h1 className="t-l">Aprender</h1>
        <span className="muted t-body">Educação financeira para o dia a dia</span>
      </div>
      <div className="card col">
        <div className="row between">
          <b className="t-h">Trilha: Primeiros passos</b>
          <span className="muted t-cap">{done} de {mods.length}</span>
        </div>
        <Progress pct={(done / mods.length) * 100} />
      </div>
      {mods.map((m) => {
        const isLocked = m.state === 'locked';
        return (
          <div key={m.slug} className={`card tight col ${m.state === 'current' ? 'mint-border' : ''}`} style={{ gap: 10, opacity: isLocked ? 0.75 : 1 }}>
            <button className="row" style={{ textAlign: 'left', width: '100%' }} onClick={() => (isLocked ? setLocked(m.slug) : navigate(`/filho/aprender/${m.slug}/0`))}>
              <div className={`tile ${isLocked ? 'locked' : m.state === 'done' ? '' : ''}`}>
                <Icon name={m.state === 'done' ? 'check' : isLocked ? 'lock' : 'book'} size={22} />
              </div>
              <div className="col grow" style={{ gap: 0, minWidth: 0 }}>
                <b className="t-h">{m.order}. {m.title}</b>
                <span className="muted t-cap">
                  {m.state === 'done' ? `Concluído · ${m.bestScore}/5 na prova` : isLocked ? `Conclua o módulo ${m.order - 1}` : `${m.lessons} lições · prova de 5 questões`}
                </span>
              </div>
              <span className={`badge ${m.state === 'done' ? 'soft' : ''}`}>+{MODULE_XP} XP</span>
            </button>
            {m.state === 'current' && <Button small onClick={() => navigate(`/filho/aprender/${m.slug}/0`)} style={{ alignSelf: 'flex-end' }}>Continuar</Button>}
          </div>
        );
      })}
      {current && (
        <Alert icon="info" title="Como funciona">
          Leia as lições e faça a prova. Com {Math.round(PASS_RATIO * 100)}% de acertos ({Math.ceil(PASS_RATIO * 5)} de 5) você passa e ganha {MODULE_XP} XP, uma vez por módulo.
        </Alert>
      )}
      <p className="muted t-cap"><Icon name="info" size={13} /> Conteúdo baseado no Banco Central (Cidadania Financeira), ANBIMA Educação e ENEF.</p>
      <Sheet open={!!locked} onClose={() => setLocked(null)}>
        {locked && (
          <>
            <div className="tile lg locked icon-top"><Icon name="lock" size={28} /></div>
            <h2 className="t-m" style={{ textAlign: 'center' }}>Módulo bloqueado</h2>
            <p className="muted" style={{ textAlign: 'center' }}>
              Conclua o módulo “{prev(mods.find((m) => m.slug === locked)!.order)?.title}” para liberar este.
            </p>
            <Button onClick={() => setLocked(null)}>Entendi</Button>
          </>
        )}
      </Sheet>
    </KidLayout>
  );
}

export function Lesson({ slug, idx }: { slug: string; idx: number }) {
  const { data, error } = useData(() => api.module(slug), [slug]);
  if (error) return <div className="screen"><TopBar title="Lição" onBack={() => navigate('/filho/aprender')} /><Alert variant="destructive" icon="alert" title="Ops">{error}</Alert></div>;
  if (!data) return <div className="screen"><TopBar title="Lição" onBack={() => navigate('/filho/aprender')} /><Loading /></div>;
  const { module: m } = data;
  const n = m.lessons.length;
  const i = Math.max(0, Math.min(n - 1, idx));
  const l = m.lessons[i];
  const last = i === n - 1;
  return (
    <div className="screen pad-bottom-actions">
      <TopBar title={m.title} onBack={() => (i > 0 ? navigate(`/filho/aprender/${slug}/${i - 1}`) : navigate('/filho/aprender'))} />
      <div className="row between">
        <span className="muted t-cap">Lição {i + 1} de {n}</span>
        <span className="mint t-cap semi">+{MODULE_XP} XP ao concluir o módulo</span>
      </div>
      <Progress small pct={((i + 1) / n) * 100} />
      <h2 className="t-l" style={{ marginTop: 8 }}>{l.title}</h2>
      <div className="lesson">
        {l.paragraphs.map((p, k) => <p key={k}>{p}</p>)}
      </div>
      {l.example && (
        <div className="example col" style={{ gap: 4 }}>
          <b><Icon name="bulb" size={14} /> Exemplo</b>
          <span className="t-body">{l.example}</span>
        </div>
      )}
      <div className="footer-actions">
        <Button onClick={() => (last ? navigate(`/filho/aprender/${slug}/prova`) : navigate(`/filho/aprender/${slug}/${i + 1}`))}>
          {last ? 'Fazer a prova' : 'Próxima'}
        </Button>
      </div>
    </div>
  );
}

const LETTERS = ['A', 'B', 'C', 'D'];

export function Quiz({ slug }: { slug: string }) {
  const { data, error } = useData(() => api.module(slug), [slug]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [exit, setExit] = useState(false);
  const [busy, setBusy] = useState(false);
  if (error) return <div className="screen"><TopBar title="Prova" onBack={() => navigate('/filho/aprender')} /><Alert variant="destructive" icon="alert" title="Ops">{error}</Alert></div>;
  if (!data) return <div className="screen"><TopBar title="Prova" onBack={() => navigate('/filho/aprender')} /><Loading /></div>;
  const m = data.module;
  const q = m.questions[i];
  const total = m.questions.length;
  const lastQ = i === total - 1;

  const next = async () => {
    const all = [...answers];
    all[i] = chosen as number;
    if (!lastQ) {
      setAnswers(all);
      setI(i + 1);
      setChosen(null);
      setChecked(false);
      return;
    }
    setBusy(true);
    let res: QuizResult | undefined;
    const ok = await run(async () => {
      res = await api.submitQuiz(slug, all);
    });
    setBusy(false);
    if (ok && res) {
      sessionStorage.setItem('mt-quiz-' + slug, JSON.stringify({ res, answers: all }));
      navigate(`/filho/aprender/${slug}/resultado`, true);
    }
  };

  return (
    <div className="screen pad-bottom-actions">
      <TopBar title={`Prova · ${m.title}`} onBack={() => setExit(true)} />
      <div className="row between">
        <span className="muted t-cap">Questão {i + 1} de {total}</span>
        <span className="muted t-cap">Nota mínima: {Math.round(PASS_RATIO * 100)}%</span>
      </div>
      <Progress small pct={((i + (checked ? 1 : 0)) / total) * 100} />
      <h2 className="t-m" style={{ marginTop: 6 }}>{q.prompt}</h2>
      <div className="col" role="radiogroup">
        {q.options.map((o, k) => {
          let cls = '';
          if (checked) cls = k === q.answer ? 'right' : k === chosen ? 'wrong' : '';
          else if (chosen === k) cls = 'selected';
          return (
            <button key={k} className={`option ${cls}`} role="radio" aria-checked={chosen === k} disabled={checked} onClick={() => setChosen(k)}>
              <span className="letter">{checked && k === q.answer ? <Icon name="check" size={13} /> : checked && k === chosen ? <Icon name="x" size={13} /> : LETTERS[k]}</span>
              {o}
            </button>
          );
        })}
      </div>
      {checked && (
        <Alert variant={chosen === q.answer ? 'info' : 'destructive'} icon={chosen === q.answer ? 'check' : 'info'} title={chosen === q.answer ? 'Resposta certa!' : 'Não foi dessa vez'}>
          {q.explanation}
        </Alert>
      )}
      <div className="footer-actions">
        {!checked ? (
          <Button disabled={chosen === null} onClick={() => setChecked(true)}>Responder</Button>
        ) : (
          <Button disabled={busy} onClick={next}>{lastQ ? 'Ver resultado' : 'Próxima'}</Button>
        )}
      </div>
      <Sheet open={exit} onClose={() => setExit(false)}>
        <div className="tile lg danger icon-top"><Icon name="alert" size={26} /></div>
        <h2 className="t-m" style={{ textAlign: 'center' }}>Sair da prova?</h2>
        <p className="muted" style={{ textAlign: 'center' }}>Seu progresso nesta prova será perdido.</p>
        <Button variant="outline" onClick={() => setExit(false)}>Continuar prova</Button>
        <Button variant="danger" onClick={() => navigate('/filho/aprender', true)}>Sair</Button>
      </Sheet>
    </div>
  );
}

export function QuizResultScreen({ slug }: { slug: string }) {
  const raw = sessionStorage.getItem('mt-quiz-' + slug);
  const { data } = useData(() => api.module(slug), [slug]);
  const { data: mods } = useData(() => api.modules());
  if (!raw) return <div className="screen"><TopBar title="Resultado" onBack={() => navigate('/filho/aprender')} /><Alert icon="info" title="Sem resultado">Faça a prova para ver o resultado.</Alert><Button onClick={() => navigate(`/filho/aprender/${slug}/prova`)}>Fazer a prova</Button></div>;
  const { res } = JSON.parse(raw) as { res: QuizResult };
  const pct = Math.round((res.correct / res.total) * 100);
  const nextMod = mods?.find((m) => m.state === 'current');
  return (
    <div className="screen pad-bottom-actions">
      <div className="hero" style={{ paddingTop: 40 }}>
        <div className={`halo ${res.passed ? '' : 'bad'}`}>
          <div>
            <Icon name={res.passed ? 'trophy' : 'refresh'} size={42} />
          </div>
        </div>
        <h1 className="t-l">{res.passed ? 'Você foi aprovado!' : 'Quase lá!'}</h1>
        <p className="muted">
          {res.passed ? `Acertou ${res.correct} de ${res.total} questões (${pct}%).` : `Você acertou ${res.correct} de ${res.total} (${pct}%). Precisa de ${Math.round(PASS_RATIO * 100)}% para passar.`}
        </p>
      </div>
      <div className="card tight">
        <div className="row-kv"><span className="muted">XP ganho</span>{res.xp ? <span className="badge">+{res.xp} XP</span> : <b>{res.passed ? 'já recebido' : '—'}</b>}</div>
        <div className="row-kv"><span className="muted">Módulo</span><b className={res.passed ? 'mint' : 'warn'}>{res.passed ? 'Concluído' : 'Em andamento'}</b></div>
        {res.passed && nextMod && <div className="row-kv"><span className="muted">Próximo</span><b>{nextMod.order}. {nextMod.title}</b></div>}
      </div>
      {!res.passed && <Alert icon="bulb" title="Dica">Releia as lições e veja o que errou. Você pode tentar quantas vezes quiser.</Alert>}
      <div className="footer-actions">
        {res.passed ? (
          <Button onClick={() => navigate('/filho/aprender')}>Continuar trilha</Button>
        ) : (
          <Button onClick={() => { sessionStorage.removeItem('mt-quiz-' + slug); navigate(`/filho/aprender/${slug}/prova`, true); }}>Tentar de novo</Button>
        )}
        <Button variant="outline" onClick={() => navigate(`/filho/aprender/${slug}/revisar`)}>Revisar respostas</Button>
        {!res.passed && data && <Button variant="ghost" onClick={() => navigate(`/filho/aprender/${slug}/0`)}>Reler as lições</Button>}
      </div>
    </div>
  );
}

export function Review({ slug }: { slug: string }) {
  const { data } = useData(() => api.module(slug), [slug]);
  const raw = sessionStorage.getItem('mt-quiz-' + slug);
  if (!data) return <div className="screen"><TopBar title="Revisar respostas" /><Loading /></div>;
  const answers: number[] = raw ? JSON.parse(raw).answers : [];
  return (
    <div className="screen">
      <TopBar title="Revisar respostas" onBack={() => navigate(`/filho/aprender/${slug}/resultado`)} />
      {data.module.questions.map((q, i) => {
        const right = answers[i] === q.answer;
        return (
          <div key={i} className="card col" style={{ gap: 10 }}>
            <div className="row between">
              <b className="t-label">Questão {i + 1}</b>
              <span className={`badge ${right ? 'soft' : 'bad'}`}>{right ? 'Certa' : 'Errada'}</span>
            </div>
            <b className="t-body">{q.prompt}</b>
            {!right && answers[i] !== undefined && <span className="danger t-cap">Sua resposta: {q.options[answers[i]]}</span>}
            <span className="mint t-cap semi">Resposta certa: {q.options[q.answer]}</span>
            <span className="muted t-cap">{q.explanation}</span>
          </div>
        );
      })}
    </div>
  );
}
