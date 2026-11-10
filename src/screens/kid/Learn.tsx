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
        <span className="muted t-cap">Educação financeira para o dia a dia</span>
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
          <div key={m.slug} className={`card tight col ${m.state === 'current' ? 'mint-border' : ''}`} style={{ gap: 10, opacity: isLocked ? 0.6 : 1 }}>
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
              {m.state === 'current' ? <span className="btn btn-primary btn-sm">Continuar</span> : <span className={`badge ${m.state === 'done' ? 'soft' : ''}`}>+{MODULE_XP} XP</span>}
            </button>
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
            <div className="tile lg mint-on-dark icon-top"><Icon name="lock" size={28} /></div>
            <h2 className="t-m" style={{ textAlign: 'center' }}>Módulo bloqueado</h2>
            {(() => {
              const pm = prev(mods.find((m) => m.slug === locked)!.order);
              return (
                <>
                  <p className="muted t-cap" style={{ textAlign: 'center' }}>
                    Termine o módulo {pm?.order} ({pm?.title}) e passe na prova para liberar este.
                  </p>
                  {pm && <Button icon="book" onClick={() => { setLocked(null); navigate(`/filho/aprender/${pm.slug}/0`); }}>Ir para o módulo {pm.order}</Button>}
                </>
              );
            })()}
            <Button variant="outline" onClick={() => setLocked(null)}>Fechar</Button>
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
      <div className="footer-actions" style={{ flexDirection: 'row' }}>
        {i > 0 && <Button variant="outline" onClick={() => navigate(`/filho/aprender/${slug}/${i - 1}`)}>Anterior</Button>}
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
              <span className={`letter ${checked && k === q.answer ? 'ok' : checked && k === chosen ? 'no' : ''}`}>{checked && k === q.answer ? <Icon name="check" size={16} /> : checked && k === chosen ? <Icon name="x" size={16} /> : LETTERS[k]}</span>
              {o}
            </button>
          );
        })}
      </div>
      {checked && (
        <Alert variant={chosen === q.answer ? 'info' : 'destructive'} icon={null} title={chosen === q.answer ? 'Correto!' : `Quase! A resposta certa é a ${LETTERS[q.answer]}.`}>
          {q.explanation}
        </Alert>
      )}
      <div className="footer-actions">
        {!checked ? (
          <Button disabled={chosen === null} onClick={() => setChecked(true)}>Responder</Button>
        ) : (
          <Button disabled={busy} onClick={next}>{lastQ ? 'Ver resultado' : 'Próxima questão'}</Button>
        )}
      </div>
      <Sheet open={exit} onClose={() => setExit(false)}>
        <div className="tile lg warn icon-top"><Icon name="alert" size={26} /></div>
        <h2 className="t-m" style={{ textAlign: 'center' }}>Sair da prova?</h2>
        <p className="muted t-cap" style={{ textAlign: 'center' }}>Seu progresso nesta prova será perdido e você começa de novo na próxima vez.</p>
        <Button onClick={() => setExit(false)}>Continuar prova</Button>
        <Button variant="danger-outline" onClick={() => navigate('/filho/aprender', true)}>Sair mesmo assim</Button>
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
  const curMod = mods?.find((m) => m.slug === slug);
  return (
    <div className="screen pad-bottom-actions">
      <div className="hero" style={{ paddingTop: 40 }}>
        <div className="halo">
          <div>
            <Icon name={res.passed ? 'trophy' : 'book'} size={56} />
          </div>
        </div>
        <h1 className="t-l">{res.passed ? 'Você foi aprovado!' : 'Quase lá!'}</h1>
        <p className="muted">
          {res.passed ? `Acertou ${res.correct} de ${res.total} questões (${pct}%).` : `Você acertou ${res.correct} de ${res.total} questões (${pct}%). A nota mínima é ${Math.round(PASS_RATIO * 100)}%.`}
        </p>
      </div>
      <div className="card tight">
        <div className="row-kv"><span className="muted">XP ganho</span>{res.xp ? <span className="badge">+{res.xp} XP</span> : <b>{res.passed ? 'já recebido' : '—'}</b>}</div>
        <div className="row-kv"><span className="muted">Módulo{curMod ? ` ${curMod.order}` : ''}</span><b className={res.passed ? 'mint' : 'warn'}>{res.passed ? 'Concluído' : 'Em andamento'}</b></div>
        {res.passed && nextMod && <div className="row-kv"><span className="muted">Próximo</span><b>{nextMod.order}. {nextMod.title}</b></div>}
      </div>
      {!res.passed && <div className="alert"><span className="alert-icon"><Icon name="info" size={20} /></span><span className="alert-desc" style={{ color: 'var(--foreground)' }}>Releia as lições e tente de novo. Você não perde XP.</span></div>}
      <div className="footer-actions">
        {res.passed ? (
          <Button onClick={() => navigate('/filho/aprender')}>Continuar trilha</Button>
        ) : (
          <Button onClick={() => { sessionStorage.removeItem('mt-quiz-' + slug); navigate(`/filho/aprender/${slug}/prova`, true); }}>Tentar de novo</Button>
        )}
        {res.passed ? (
          <Button variant="outline" onClick={() => navigate(`/filho/aprender/${slug}/revisar`)}>Revisar respostas</Button>
        ) : (
          data && <Button variant="outline" onClick={() => navigate(`/filho/aprender/${slug}/0`)}>Rever as lições</Button>
        )}
      </div>
    </div>
  );
}

export function Review({ slug }: { slug: string }) {
  const { data } = useData(() => api.module(slug), [slug]);
  const [open, setOpen] = useState<number | null>(null);
  const raw = sessionStorage.getItem('mt-quiz-' + slug);
  if (!data) return <div className="screen"><TopBar title="Revisar respostas" /><Loading /></div>;
  const answers: number[] = raw ? JSON.parse(raw).answers : [];
  return (
    <div className="screen">
      <TopBar title="Revisar respostas" onBack={() => navigate(`/filho/aprender/${slug}/resultado`)} />
      <div className="card menu">
        {data.module.questions.map((q, i) => {
          const right = answers[i] === q.answer;
          return (
            <div key={i}>
              <button className="list-item" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <div className={`tile sm ${right ? '' : 'danger'}`} style={{ width: 32, height: 32 }}>
                  <Icon name={right ? 'check' : 'x'} size={16} />
                </div>
                <span className="label" style={{ fontSize: 14 }}>Q{i + 1} · {q.prompt}</span>
                <Icon name="chevron" size={20} className="dim" />
              </button>
              {open === i && (
                <div className="col" style={{ gap: 6, padding: '0 14px 14px' }}>
                  {!right && answers[i] !== undefined && <span className="danger t-cap">Sua resposta: {q.options[answers[i]]}</span>}
                  <span className="mint t-cap semi">Resposta certa: {q.options[q.answer]}</span>
                  <span className="muted t-cap">{q.explanation}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="muted t-cap">Toque em uma questão para ver a explicação.</p>
    </div>
  );
}
