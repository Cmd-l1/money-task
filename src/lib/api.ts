// Camada de dados do app. Hoje: modo demonstração (tudo local, sem enviar dados a nenhum servidor).
// As telas só falam com `api`, então a versão com Supabase entra aqui sem mudar as telas.
import { EDU } from '../data/edu';
import { dayKey, loadDb, nextId, resetDb, saveDb, type ChildRec, type DemoDB, type Notice } from './demoDb';
import { taskIcon } from '../ui/Icon';
import { EDU_MIN_AGE, MODULE_XP, PASS_RATIO, levelFor } from './xp';
import type { Achievement, Child, EduModule, LedgerEntry, ModuleStatus, QuizResult, Redemption, Reward, Session, Submission, Task } from './types';

const DAY = 86400000;
export class AppError extends Error {}
const fail = (m: string): never => {
  throw new AppError(m);
};

// ---------- sessão ----------
const SKEY = 'mt-session';
let session: Session | null = null;
const listeners = new Set<() => void>();
let version = 0;

export function getSession(): Session | null {
  if (session) return session;
  try {
    const raw = localStorage.getItem(SKEY);
    if (raw) session = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return session;
}
export function setSession(s: Session | null) {
  session = s;
  try {
    if (s) localStorage.setItem(SKEY, JSON.stringify(s));
    else localStorage.removeItem(SKEY);
  } catch {
    /* ignore */
  }
  bump();
}
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function bump() {
  version++;
  listeners.forEach((l) => l());
}
export function getVersion() {
  return version;
}

// ---------- cálculos ----------
function bal(db: DemoDB, id: string) {
  let balance = 0;
  let lifetime = 0;
  for (const e of db.ledger) {
    if (e.childId !== id) continue;
    balance += e.delta;
    if (e.delta > 0) lifetime += e.delta;
  }
  return { balance, lifetime };
}
function toChild(db: DemoDB, c: ChildRec): Child {
  const { balance, lifetime } = bal(db, c.id);
  return { id: c.id, name: c.name, age: c.age, username: c.username, balance, lifetime, level: levelFor(lifetime), streak: c.streak, lastActive: c.lastActive };
}
function rec(db: DemoDB, id: string): ChildRec {
  return db.children.find((c) => c.id === id) || fail('Perfil não encontrado.');
}
function addLedger(db: DemoDB, childId: string, delta: number, reason: string) {
  db.ledger.push({ id: nextId(db, 'l'), childId, delta, reason, createdAt: Date.now() });
}
function notice(db: DemoDB, childId: string, kind: Notice['kind'], title: string, text: string, taskId?: string) {
  db.notices.push({ id: nextId(db, 'n'), childId, kind, title, text, taskId, seen: false, createdAt: Date.now() });
}
const ACH: { code: string; title: string; hint: string; icon: string }[] = [
  { code: 'first_task', title: 'Primeira tarefa', hint: 'Conclua uma tarefa', icon: 'check' },
  { code: 'streak_3', title: '3 dias seguidos', hint: 'Sequência de 3 dias', icon: 'flame' },
  { code: 'first_redeem', title: 'Primeiro resgate', hint: 'Troque XP por uma recompensa', icon: 'gift' },
  { code: 'xp_500', title: 'Meta de 500 XP', hint: 'Acumule 500 XP', icon: 'star' },
  { code: 'streak_7', title: '7 dias seguidos', hint: 'Sequência de 7 dias', icon: 'flame' },
  { code: 'study_master', title: 'Mestre dos estudos', hint: 'Conclua todos os módulos', icon: 'book' },
];
function unlockedSet(db: DemoDB, childId: string): Set<string> {
  const c = rec(db, childId);
  const { lifetime } = bal(db, childId);
  const s = new Set<string>();
  if (db.submissions.some((x) => x.childId === childId && x.status === 'approved')) s.add('first_task');
  if (c.bestStreak >= 3) s.add('streak_3');
  if (c.bestStreak >= 7) s.add('streak_7');
  if (db.redemptions.some((r) => r.childId === childId)) s.add('first_redeem');
  if (lifetime >= 500) s.add('xp_500');
  const done = Object.values(db.edu[childId] || {}).filter((m) => m.done).length;
  if (done >= EDU.length) s.add('study_master');
  return s;
}
/** Executa uma mudança e gera avisos de nível e de conquistas novas. */
function withProgress(db: DemoDB, childId: string, fn: () => void) {
  const before = bal(db, childId);
  const ach = unlockedSet(db, childId);
  fn();
  const after = bal(db, childId);
  const lvBefore = levelFor(before.lifetime);
  const lvAfter = levelFor(after.lifetime);
  if (lvAfter > lvBefore) notice(db, childId, 'levelup', 'Você subiu de nível!', `Agora você está no Nível ${lvAfter}.`);
  const now = unlockedSet(db, childId);
  for (const a of ACH) {
    if (now.has(a.code) && !ach.has(a.code)) notice(db, childId, 'achievement', 'Nova conquista!', a.title);
  }
}
function touchStreak(db: DemoDB, childId: string) {
  const c = rec(db, childId);
  const today = dayKey();
  if (c.lastActive === today) return;
  c.streak = c.lastActive === dayKey(Date.now() - DAY) ? c.streak + 1 : 1;
  c.bestStreak = Math.max(c.bestStreak, c.streak);
  c.lastActive = today;
}

export type TaskState = 'todo' | 'pending' | 'done' | 'rejected';
export interface KidTask {
  task: Task;
  state: TaskState;
  submission?: Submission;
}
function taskState(db: DemoDB, task: Task, childId: string): { state: TaskState; submission?: Submission } {
  const subs = db.submissions.filter((s) => s.taskId === task.id && s.childId === childId).sort((a, b) => b.createdAt - a.createdAt);
  const pending = subs.find((s) => s.status === 'pending');
  if (pending) return { state: 'pending', submission: pending };
  const ok = subs.find((s) => s.status === 'approved');
  if (ok) {
    const at = ok.decidedAt || ok.createdAt;
    const stillDone = task.repeat === 'once' || (task.repeat === 'daily' && dayKey(at) === dayKey()) || (task.repeat === 'weekly' && Date.now() - at < 7 * DAY);
    if (stillDone && (!subs[0] || subs[0].status === 'approved')) return { state: 'done', submission: ok };
  }
  const last = subs[0];
  if (last && last.status === 'rejected') return { state: 'rejected', submission: last };
  return { state: 'todo' };
}
function myId(): string {
  const s = getSession();
  if (!s || s.role !== 'kid' || !s.childId) return fail('Entre como filho para continuar.');
  return s.childId;
}
const assigned = (db: DemoDB, childId: string) => db.tasks.filter((t) => t.active && (t.childId === childId || t.childId === 'all'));

// ---------- API ----------
export const api = {
  mode: 'demo' as const,

  // sessão
  startDemo(role: 'parent' | 'kid', childId?: string) {
    resetDb();
    setSession({ mode: 'demo', role, childId });
  },
  loginChild(username: string, password: string) {
    const db = loadDb();
    const u = username.trim().toLowerCase();
    const c = db.children.find((x) => x.username === u);
    if (!c || c.password !== password) fail('Usuário ou senha incorretos.');
    setSession({ mode: 'demo', role: 'kid', childId: c!.id });
  },
  logout() {
    setSession(null);
  },
  resetDemo() {
    resetDb();
    bump();
  },

  // ---------- filho ----------
  async me(): Promise<Child> {
    const db = loadDb();
    return toChild(db, rec(db, myId()));
  },
  async myTasks(): Promise<KidTask[]> {
    const db = loadDb();
    const id = myId();
    return assigned(db, id).map((t) => ({ task: t, ...taskState(db, t, id) }));
  },
  async myTask(taskId: string): Promise<KidTask> {
    const db = loadDb();
    const id = myId();
    const t = db.tasks.find((x) => x.id === taskId) || fail('Tarefa não encontrada.');
    return { task: t, ...taskState(db, t, id) };
  },
  async submitTask(taskId: string, photo?: string) {
    const db = loadDb();
    const id = myId();
    const t = db.tasks.find((x) => x.id === taskId) || fail('Tarefa não encontrada.');
    const st = taskState(db, t, id);
    if (st.state === 'pending') fail('Essa tarefa já foi enviada.');
    if (st.state === 'done') fail('Você já concluiu essa tarefa.');
    if (t.needsPhoto && !photo) fail('Esta tarefa precisa de uma foto como prova.');
    db.submissions.push({ id: nextId(db, 's'), taskId, childId: id, status: 'pending', photo, createdAt: Date.now() });
    saveDb();
    bump();
  },
  async myRewards(): Promise<Reward[]> {
    const db = loadDb();
    const id = myId();
    return db.rewards.filter((r) => r.active && (r.childId === id || r.childId === 'all')).sort((a, b) => a.cost - b.cost);
  },
  async reward(rewardId: string): Promise<Reward> {
    return loadDb().rewards.find((r) => r.id === rewardId) || fail('Recompensa não encontrada.');
  },
  async redeem(rewardId: string): Promise<{ balance: number }> {
    const db = loadDb();
    const id = myId();
    const r = db.rewards.find((x) => x.id === rewardId) || fail('Recompensa não encontrada.');
    const { balance } = bal(db, id);
    if (balance < r.cost) fail('XP insuficiente.');
    withProgress(db, id, () => {
      db.redemptions.push({ id: nextId(db, 'x'), rewardId, childId: id, cost: r.cost, status: 'pending', createdAt: Date.now() });
      addLedger(db, id, -r.cost, `Resgate: ${r.title}`);
    });
    saveDb();
    bump();
    return { balance: bal(db, id).balance };
  },
  async myRedemptions(): Promise<(Redemption & { reward?: Reward })[]> {
    const db = loadDb();
    const id = myId();
    return db.redemptions
      .filter((x) => x.childId === id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((x) => ({ ...x, reward: db.rewards.find((r) => r.id === x.rewardId) }));
  },
  async myLedger(): Promise<LedgerEntry[]> {
    const db = loadDb();
    const id = myId();
    return db.ledger.filter((e) => e.childId === id).sort((a, b) => b.createdAt - a.createdAt);
  },
  async myAchievements(): Promise<Achievement[]> {
    const db = loadDb();
    const s = unlockedSet(db, myId());
    return ACH.map((a) => ({ ...a, unlocked: s.has(a.code) }));
  },
  async nextNotice(): Promise<Notice | null> {
    const db = loadDb();
    const id = myId();
    return db.notices.filter((n) => n.childId === id && !n.seen).sort((a, b) => a.createdAt - b.createdAt)[0] || null;
  },
  async dismissNotice(id: string) {
    const db = loadDb();
    const n = db.notices.find((x) => x.id === id);
    if (n) n.seen = true;
    saveDb();
    bump();
  },
  async weekStats(): Promise<{ done: number; goal: number }> {
    const db = loadDb();
    const id = myId();
    const since = Date.now() - 7 * DAY;
    const done = db.submissions.filter((s) => s.childId === id && s.status === 'approved' && (s.decidedAt || s.createdAt) > since).length;
    return { done, goal: 5 };
  },

  // ---------- educação financeira ----------
  async eduAllowed(): Promise<boolean> {
    return (await api.me()).age >= EDU_MIN_AGE;
  },
  async modules(): Promise<ModuleStatus[]> {
    const db = loadDb();
    const id = myId();
    const prog = db.edu[id] || {};
    let currentSet = false;
    return EDU.map((m) => {
      const p = prog[m.slug];
      let state: ModuleStatus['state'];
      if (p?.done) state = 'done';
      else if (!currentSet) {
        state = 'current';
        currentSet = true;
      } else state = 'locked';
      return { slug: m.slug, title: m.title, summary: m.summary, order: m.order, state, bestScore: p?.best, lessons: m.lessons.length };
    });
  },
  async module(slug: string): Promise<{ module: EduModule; status: ModuleStatus }> {
    const status = (await api.modules()).find((m) => m.slug === slug) || fail('Módulo não encontrado.');
    if (status.state === 'locked') fail('Conclua o módulo anterior para liberar este.');
    return { module: EDU.find((m) => m.slug === slug)!, status };
  },
  async submitQuiz(slug: string, answers: number[]): Promise<QuizResult> {
    const db = loadDb();
    const id = myId();
    const m = EDU.find((x) => x.slug === slug) || fail('Módulo não encontrado.');
    const status = (await api.modules()).find((x) => x.slug === slug)!;
    if (status.state === 'locked') fail('Módulo bloqueado.');
    const wrong: QuizResult['wrong'] = [];
    let correct = 0;
    m.questions.forEach((q, i) => {
      if (answers[i] === q.answer) correct++;
      else wrong.push({ index: i, chosen: answers[i], answer: q.answer });
    });
    const total = m.questions.length;
    const passed = correct / total >= PASS_RATIO;
    let xp = 0;
    db.edu[id] = db.edu[id] || {};
    const prev = db.edu[id][slug];
    withProgress(db, id, () => {
      const best = Math.max(prev?.best || 0, correct);
      if (passed && !prev?.done) {
        xp = MODULE_XP;
        addLedger(db, id, MODULE_XP, `Módulo: ${m.title}`);
        db.edu[id][slug] = { best, done: true };
        touchStreak(db, id);
      } else db.edu[id][slug] = { best, done: !!prev?.done };
    });
    saveDb();
    bump();
    return { correct, total, passed, xp, wrong };
  },

  // ---------- responsável ----------
  async parentName(): Promise<string> {
    return loadDb().parentName;
  },
  async children(): Promise<Child[]> {
    const db = loadDb();
    return db.children.map((c) => toChild(db, c));
  },
  async child(id: string): Promise<Child> {
    const db = loadDb();
    return toChild(db, rec(db, id));
  },
  async createChild(input: { name: string; age: number; username: string; password: string }): Promise<Child> {
    const db = loadDb();
    const name = input.name.trim();
    const username = input.username.trim().toLowerCase();
    if (!name) fail('Informe o nome do filho(a).');
    if (!(input.age >= 7 && input.age <= 18)) fail('A idade deve ser entre 7 e 18 anos.');
    if (!/^[a-z0-9._]{3,20}$/.test(username)) fail('O usuário deve ter de 3 a 20 letras minúsculas, números, ponto ou _ (sem espaços).');
    if (db.children.some((c) => c.username === username)) fail('Esse usuário já está em uso. Escolha outro.');
    if (input.password.length < 6) fail('A senha deve ter no mínimo 6 caracteres.');
    const c: ChildRec = { id: nextId(db, 'c'), name, age: input.age, username, password: input.password, streak: 0, bestStreak: 0, lastActive: null };
    db.children.push(c);
    saveDb();
    bump();
    return toChild(db, c);
  },
  async updateChild(id: string, input: { name: string; age: number; username: string }) {
    const db = loadDb();
    const c = rec(db, id);
    const username = input.username.trim().toLowerCase();
    if (!input.name.trim()) fail('Informe o nome.');
    if (!(input.age >= 7 && input.age <= 18)) fail('A idade deve ser entre 7 e 18 anos.');
    if (!/^[a-z0-9._]{3,20}$/.test(username)) fail('Usuário inválido (3 a 20 letras minúsculas, números, ponto ou _).');
    if (db.children.some((x) => x.username === username && x.id !== id)) fail('Esse usuário já está em uso.');
    c.name = input.name.trim();
    c.age = input.age;
    c.username = username;
    saveDb();
    bump();
  },
  async resetChildPassword(id: string, password: string) {
    if (password.length < 6) fail('A senha deve ter no mínimo 6 caracteres.');
    const db = loadDb();
    rec(db, id).password = password;
    saveDb();
    bump();
  },
  async removeChild(id: string) {
    const db = loadDb();
    db.children = db.children.filter((c) => c.id !== id);
    db.tasks = db.tasks.filter((t) => t.childId !== id);
    db.submissions = db.submissions.filter((s) => s.childId !== id);
    db.redemptions = db.redemptions.filter((s) => s.childId !== id);
    db.ledger = db.ledger.filter((s) => s.childId !== id);
    db.notices = db.notices.filter((s) => s.childId !== id);
    delete db.edu[id];
    saveDb();
    bump();
  },

  async tasks(): Promise<Task[]> {
    return loadDb().tasks.filter((t) => t.active);
  },
  async task(id: string): Promise<Task> {
    return loadDb().tasks.find((t) => t.id === id) || fail('Tarefa não encontrada.');
  },
  async saveTask(input: Partial<Task> & { title: string; xp: number; childId: string }) {
    const db = loadDb();
    const title = input.title.trim();
    if (!title) fail('Informe o título da tarefa.');
    if (!(input.xp > 0 && input.xp <= 5000)) fail('O XP deve ser um número entre 1 e 5000.');
    if (!input.childId) fail('Escolha para quem é a tarefa.');
    if (input.id) {
      const t = db.tasks.find((x) => x.id === input.id) || fail('Tarefa não encontrada.');
      Object.assign(t, { title, description: input.description ?? t.description, xp: input.xp, childId: input.childId, repeat: input.repeat ?? t.repeat, needsPhoto: input.needsPhoto ?? t.needsPhoto, icon: taskIcon(title) });
    } else {
      db.tasks.push({ id: nextId(db, 't'), title, description: input.description || '', xp: input.xp, childId: input.childId, repeat: input.repeat || 'daily', needsPhoto: !!input.needsPhoto, icon: taskIcon(title), active: true });
    }
    saveDb();
    bump();
  },
  async deleteTask(id: string) {
    const db = loadDb();
    const t = db.tasks.find((x) => x.id === id);
    if (t) t.active = false;
    db.submissions = db.submissions.filter((s) => !(s.taskId === id && s.status === 'pending'));
    saveDb();
    bump();
  },
  async rewards(): Promise<Reward[]> {
    return loadDb().rewards.filter((r) => r.active);
  },
  async saveReward(input: Partial<Reward> & { title: string; cost: number }) {
    const db = loadDb();
    const title = input.title.trim();
    if (!title) fail('Informe o nome da recompensa.');
    if (!(input.cost > 0 && input.cost <= 20000)) fail('O custo deve ser um número entre 1 e 20000 XP.');
    if (input.id) {
      const r = db.rewards.find((x) => x.id === input.id) || fail('Recompensa não encontrada.');
      Object.assign(r, { title, description: input.description ?? r.description, cost: input.cost, icon: input.icon || r.icon, childId: input.childId || r.childId });
    } else {
      db.rewards.push({ id: nextId(db, 'r'), title, description: input.description || '', cost: input.cost, icon: input.icon || 'gift', childId: input.childId || 'all', active: true });
    }
    saveDb();
    bump();
  },
  async deleteReward(id: string) {
    const r = loadDb().rewards.find((x) => x.id === id);
    if (r) r.active = false;
    saveDb();
    bump();
  },
  async redemptionsAll(): Promise<(Redemption & { reward?: Reward; child?: Child })[]> {
    const db = loadDb();
    return db.redemptions
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((x) => ({ ...x, reward: db.rewards.find((r) => r.id === x.rewardId), child: db.children.find((c) => c.id === x.childId) ? toChild(db, rec(db, x.childId)) : undefined }));
  },
  async markDelivered(id: string) {
    const db = loadDb();
    const r = db.redemptions.find((x) => x.id === id);
    if (r) r.status = 'delivered';
    saveDb();
    bump();
  },
  async submissions(status: Submission['status'] = 'pending'): Promise<(Submission & { task?: Task; child?: Child })[]> {
    const db = loadDb();
    return db.submissions
      .filter((s) => s.status === status)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((s) => ({ ...s, task: db.tasks.find((t) => t.id === s.taskId), child: db.children.some((c) => c.id === s.childId) ? toChild(db, rec(db, s.childId)) : undefined }));
  },
  async approve(id: string) {
    const db = loadDb();
    const s = db.submissions.find((x) => x.id === id) || fail('Envio não encontrado.');
    if (s.status !== 'pending') fail('Esse envio já foi analisado.');
    const t = db.tasks.find((x) => x.id === s.taskId) || fail('Tarefa não encontrada.');
    withProgress(db, s.childId, () => {
      s.status = 'approved';
      s.decidedAt = Date.now();
      addLedger(db, s.childId, t.xp, t.title);
      touchStreak(db, s.childId);
    });
    notice(db, s.childId, 'approved', 'Tarefa aprovada!', `+${t.xp} XP na sua conta`, t.id);
    saveDb();
    bump();
  },
  async reject(id: string, reason: string) {
    const db = loadDb();
    const s = db.submissions.find((x) => x.id === id) || fail('Envio não encontrado.');
    if (s.status !== 'pending') fail('Esse envio já foi analisado.');
    const t = db.tasks.find((x) => x.id === s.taskId);
    s.status = 'rejected';
    s.reason = reason.trim();
    s.decidedAt = Date.now();
    notice(db, s.childId, 'rejected', 'Tarefa recusada', reason.trim() || 'Seu responsável pediu para refazer.', t?.id);
    saveDb();
    bump();
  },
  async childDetail(id: string): Promise<{ child: Child; week: { label: string; xp: number }[]; weekTotal: number; recent: LedgerEntry[] }> {
    const db = loadDb();
    const child = toChild(db, rec(db, id));
    const labels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    const week: { label: string; xp: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const t = Date.now() - i * DAY;
      const key = dayKey(t);
      const xp = db.ledger.filter((e) => e.childId === id && e.delta > 0 && dayKey(e.createdAt) === key).reduce((a, e) => a + e.delta, 0);
      week.push({ label: labels[new Date(t).getDay()], xp });
    }
    const recent = db.ledger.filter((e) => e.childId === id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
    return { child, week, weekTotal: week.reduce((a, w) => a + w.xp, 0), recent };
  },
  async reports(period: 'week' | 'month'): Promise<{ total: number; tasks: number; perChild: { child: Child; xp: number }[] }> {
    const db = loadDb();
    const since = Date.now() - (period === 'week' ? 7 : 30) * DAY;
    const perChild = db.children.map((c) => ({
      child: toChild(db, c),
      xp: db.ledger.filter((e) => e.childId === c.id && e.delta > 0 && e.createdAt > since).reduce((a, e) => a + e.delta, 0),
    }));
    const tasks = db.submissions.filter((s) => s.status === 'approved' && (s.decidedAt || s.createdAt) > since).length;
    return { total: perChild.reduce((a, c) => a + c.xp, 0), tasks, perChild };
  },
  async pendingCount(): Promise<number> {
    return loadDb().submissions.filter((s) => s.status === 'pending').length;
  },
  async exportData(): Promise<string> {
    const db = loadDb();
    const safe = { ...db, children: db.children.map(({ password, ...c }) => c) };
    return JSON.stringify(safe, null, 2);
  },
};
