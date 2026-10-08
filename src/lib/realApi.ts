// Contas reais: os mesmos métodos do modo demonstração, mas gravando no Supabase.
// As regras importantes (aprovar, resgatar, corrigir prova) rodam no servidor, em funções do banco.
import { EDU } from '../data/edu';
import { taskIcon } from '../ui/Icon';
import { EDU_MIN_AGE } from './xp';
import { ACH, localDayKey, streakFromDays } from './ach';
import { AppError, bump, fail, getSession, setSession } from './core';
import * as sb from './sb';
import type { Notice } from './demoDb';
import type { KidTask, TaskState } from './demoApi';
import type { Achievement, Child, EduModule, LedgerEntry, ModuleStatus, QuizResult, Redemption, Reward, Submission, Task } from './types';

type Row = Record<string, any>;
const DAY = 86400000;
const ts = (s?: string | null) => (s ? new Date(s).getTime() : 0);
const uid = () => sb.myUserId() || fail('Entre para continuar.');
const q = encodeURIComponent;

// ---------- mapeamentos (banco -> app) ----------
const mapTask = (r: Row): Task => ({ id: r.id, title: r.title, description: r.description || '', xp: r.xp, childId: r.child_id, repeat: r.recurrence, needsPhoto: !!r.require_photo, icon: taskIcon(r.title), active: !!r.active });
const mapReward = (r: Row): Reward => ({ id: r.id, title: r.title, description: r.description || '', cost: r.cost_xp, icon: r.icon || 'gift', childId: r.child_id || 'all', active: !!r.active });
const mapSub = (r: Row, photo?: string): Submission => ({ id: r.id, taskId: r.task_id, childId: r.child_id, status: r.status, photo, reason: r.reject_reason || undefined, createdAt: ts(r.submitted_at), decidedAt: ts(r.reviewed_at) || undefined });
const mapRedemption = (r: Row): Redemption => ({ id: r.id, rewardId: r.reward_id, childId: r.child_id, cost: r.cost_xp, status: r.status, createdAt: ts(r.created_at) });
const mapLedger = (r: Row): LedgerEntry => ({ id: r.id, childId: r.child_id, delta: r.delta, reason: r.description, createdAt: ts(r.created_at) });

async function loadChildren(onlyId?: string): Promise<Child[]> {
  const f = onlyId ? `&id=eq.${onlyId}` : '';
  const [ps, st, lg] = await Promise.all([
    sb.rest<Row[]>(`profiles?role=eq.child${f}&select=id,full_name,username,age&order=created_at.asc`),
    sb.rest<Row[]>(`child_stats?select=child_id,balance,lifetime,level${onlyId ? `&child_id=eq.${onlyId}` : ''}`),
    sb.rest<Row[]>(`xp_ledger?delta=gt.0&kind=in.(task,quiz)${onlyId ? `&child_id=eq.${onlyId}` : ''}&select=child_id,created_at&order=created_at.desc&limit=3000`),
  ]);
  const days = new Map<string, Set<string>>();
  for (const l of lg) {
    const s = days.get(l.child_id) || new Set<string>();
    s.add(localDayKey(new Date(l.created_at)));
    days.set(l.child_id, s);
  }
  return ps.map((p) => {
    const s = st.find((x) => x.child_id === p.id);
    const sk = streakFromDays(days.get(p.id) || new Set());
    return { id: p.id, name: p.full_name, age: p.age, username: p.username, balance: s?.balance || 0, lifetime: s?.lifetime || 0, level: s?.level || 1, streak: sk.streak, lastActive: sk.lastActive };
  });
}
async function oneChild(id: string): Promise<Child> {
  return (await loadChildren(id))[0] || fail('Perfil não encontrado.');
}
const myId = () => {
  const s = getSession();
  if (!s || s.role !== 'kid') return fail('Entre como filho para continuar.');
  return uid();
};

function taskState(task: Task, subsAll: Submission[]): { state: TaskState; submission?: Submission } {
  const subs = subsAll.filter((s) => s.taskId === task.id).sort((a, b) => b.createdAt - a.createdAt);
  const pending = subs.find((s) => s.status === 'pending');
  if (pending) return { state: 'pending', submission: pending };
  const ok = subs.find((s) => s.status === 'approved');
  if (ok) {
    const at = ok.decidedAt || ok.createdAt;
    const stillDone = task.repeat === 'once' || (task.repeat === 'daily' && localDayKey(at) === localDayKey(Date.now())) || (task.repeat === 'weekly' && Date.now() - at < 7 * DAY);
    if (stillDone && (!subs[0] || subs[0].status === 'approved')) return { state: 'done', submission: ok };
  }
  if (subs[0] && subs[0].status === 'rejected') return { state: 'rejected', submission: subs[0] };
  return { state: 'todo' };
}

// ---------- módulos de educação financeira ----------
let moduleIds: Record<string, string> | null = null;
async function moduleIdMap(): Promise<Record<string, string>> {
  if (moduleIds) return moduleIds;
  const rows = await sb.rest<Row[]>('edu_modules?select=id,slug');
  const m: Record<string, string> = {};
  rows.forEach((r) => (m[r.slug] = r.id));
  moduleIds = m;
  return m;
}
async function eduProgress(childId: string): Promise<Record<string, { best: number; done: boolean }>> {
  const [ids, att] = await Promise.all([moduleIdMap(), sb.rest<Row[]>(`edu_attempts?child_id=eq.${childId}&select=module_id,score,passed`)]);
  const bySlug: Record<string, string> = {};
  Object.entries(ids).forEach(([slug, id]) => (bySlug[id] = slug));
  const out: Record<string, { best: number; done: boolean }> = {};
  for (const a of att) {
    const slug = bySlug[a.module_id];
    if (!slug) continue;
    const cur = out[slug] || { best: 0, done: false };
    out[slug] = { best: Math.max(cur.best, a.score), done: cur.done || !!a.passed };
  }
  return out;
}

// ---------- avisos (nível, conquistas, tarefas analisadas) guardados só neste aparelho ----------
interface Seen {
  init: boolean;
  ids: string[];
  level: number;
  ach: string[];
}
const seenKey = (id: string) => `mt-seen-${id}`;
function loadSeen(id: string): Seen {
  try {
    const r = localStorage.getItem(seenKey(id));
    if (r) return JSON.parse(r);
  } catch {
    /* ignore */
  }
  return { init: false, ids: [], level: 1, ach: [] };
}
function saveSeen(id: string, s: Seen) {
  try {
    localStorage.setItem(seenKey(id), JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

async function unlocked(child: Child): Promise<Set<string>> {
  const [subs, reds, prog, lg] = await Promise.all([
    sb.rest<Row[]>(`task_submissions?child_id=eq.${child.id}&status=eq.approved&select=id&limit=1`),
    sb.rest<Row[]>(`redemptions?child_id=eq.${child.id}&select=id&limit=1`),
    eduProgress(child.id),
    sb.rest<Row[]>(`xp_ledger?child_id=eq.${child.id}&delta=gt.0&kind=in.(task,quiz)&select=created_at&order=created_at.desc&limit=3000`),
  ]);
  const best = streakFromDays(new Set(lg.map((l) => localDayKey(new Date(l.created_at))))).best;
  const s = new Set<string>();
  if (subs.length) s.add('first_task');
  if (best >= 3) s.add('streak_3');
  if (best >= 7) s.add('streak_7');
  if (reds.length) s.add('first_redeem');
  if (child.lifetime >= 500) s.add('xp_500');
  if (Object.values(prog).filter((p) => p.done).length >= EDU.length) s.add('study_master');
  return s;
}

const validUser = (u: string) => /^[a-z0-9._]{3,20}$/.test(u);

export const realApi = {
  // ---------- filho ----------
  async me(): Promise<Child> {
    return oneChild(myId());
  },
  async myTasks(): Promise<KidTask[]> {
    const id = myId();
    const [tasks, subs] = await Promise.all([sb.rest<Row[]>('tasks?active=eq.true&select=*&order=created_at.asc'), sb.rest<Row[]>(`task_submissions?child_id=eq.${id}&select=*&order=submitted_at.desc`)]);
    const ms = subs.map((s) => mapSub(s));
    return tasks.map(mapTask).map((t) => ({ task: t, ...taskState(t, ms) }));
  },
  async myTask(taskId: string): Promise<KidTask> {
    const all = await realApi.myTasks();
    return all.find((t) => t.task.id === taskId) || fail('Tarefa não encontrada.');
  },
  async submitTask(taskId: string, photo?: string) {
    const id = myId();
    const kt = await realApi.myTask(taskId);
    if (kt.state === 'pending') fail('Essa tarefa já foi enviada.');
    if (kt.state === 'done') fail('Você já concluiu essa tarefa.');
    if (kt.task.needsPhoto && !photo) fail('Esta tarefa precisa de uma foto como prova.');
    let path: string | null = null;
    if (photo) {
      const blob = await (await fetch(photo)).blob();
      path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      await sb.uploadPhoto(path, blob);
    }
    await sb.rpc('submit_task', { p_task: taskId, p_note: null, p_photo: path });
  },
  async myRewards(): Promise<Reward[]> {
    myId();
    const rows = await sb.rest<Row[]>('rewards?active=eq.true&select=*&order=cost_xp.asc');
    return rows.map(mapReward);
  },
  async reward(rewardId: string): Promise<Reward> {
    const rows = await sb.rest<Row[]>(`rewards?id=eq.${rewardId}&select=*`);
    return rows[0] ? mapReward(rows[0]) : fail('Recompensa não encontrada.');
  },
  async redeem(rewardId: string): Promise<{ balance: number }> {
    const id = myId();
    await sb.rpc('redeem_reward', { p_reward: rewardId });
    return { balance: (await oneChild(id)).balance };
  },
  async myRedemptions(): Promise<(Redemption & { reward?: Reward })[]> {
    const id = myId();
    const rows = await sb.rest<Row[]>(`redemptions?child_id=eq.${id}&select=*,rewards(*)&order=created_at.desc`);
    return rows.map((r) => ({ ...mapRedemption(r), reward: r.rewards ? mapReward(r.rewards) : undefined }));
  },
  async myLedger(): Promise<LedgerEntry[]> {
    const id = myId();
    const rows = await sb.rest<Row[]>(`xp_ledger?child_id=eq.${id}&select=*&order=created_at.desc&limit=300`);
    return rows.map(mapLedger);
  },
  async myAchievements(): Promise<Achievement[]> {
    const me = await realApi.me();
    const s = await unlocked(me);
    return ACH.map((a) => ({ ...a, unlocked: s.has(a.code) }));
  },
  async nextNotice(): Promise<Notice | null> {
    const id = myId();
    const st = loadSeen(id);
    const me = await realApi.me();
    const ach = await unlocked(me);
    const rows = await sb.rest<Row[]>(`task_submissions?child_id=eq.${id}&status=in.(approved,rejected)&select=id,status,reject_reason,reviewed_at,task_id,tasks(xp,title)&order=reviewed_at.desc&limit=30`);
    if (!st.init) {
      // primeira vez neste aparelho: só registra o ponto de partida, sem repetir o passado
      saveSeen(id, { init: true, ids: rows.map((r) => `sub:${r.id}`), level: me.level, ach: [...ach] });
      return null;
    }
    const mk = (nid: string, kind: Notice['kind'], title: string, text: string, at: number, taskId?: string): Notice => ({ id: nid, childId: id, kind, title, text, taskId, seen: false, createdAt: at });
    const list: Notice[] = [];
    for (const r of rows) {
      if (st.ids.includes(`sub:${r.id}`)) continue;
      const at = ts(r.reviewed_at);
      if (r.status === 'approved') list.push(mk(`sub:${r.id}`, 'approved', 'Tarefa aprovada!', `+${r.tasks?.xp ?? ''} XP na sua conta`, at, r.task_id));
      else list.push(mk(`sub:${r.id}`, 'rejected', 'Tarefa recusada', r.reject_reason || 'Seu responsável pediu para refazer.', at, r.task_id));
    }
    list.sort((a, b) => a.createdAt - b.createdAt);
    if (me.level > st.level) list.push(mk(`lvl:${me.level}`, 'levelup', 'Você subiu de nível!', `Agora você está no Nível ${me.level}.`, Date.now()));
    for (const a of ACH) if (ach.has(a.code) && !st.ach.includes(a.code)) list.push(mk(`ach:${a.code}`, 'achievement', 'Nova conquista!', a.title, Date.now()));
    return list[0] || null;
  },
  async dismissNotice(nid: string) {
    const s = getSession();
    const id = s?.role === 'kid' ? uid() : '';
    if (!id) return;
    const st = loadSeen(id);
    if (nid.startsWith('sub:')) st.ids = [...st.ids, nid].slice(-200);
    else if (nid.startsWith('lvl:')) st.level = Math.max(st.level, Number(nid.slice(4)));
    else if (nid.startsWith('ach:')) st.ach = [...new Set([...st.ach, nid.slice(4)])];
    saveSeen(id, st);
    bump();
  },
  async weekStats(): Promise<{ done: number; goal: number }> {
    const id = myId();
    const since = new Date(Date.now() - 7 * DAY).toISOString();
    const rows = await sb.rest<Row[]>(`task_submissions?child_id=eq.${id}&status=eq.approved&reviewed_at=gte.${q(since)}&select=id`);
    return { done: rows.length, goal: 5 };
  },

  // ---------- educação financeira ----------
  async eduAllowed(): Promise<boolean> {
    return (await realApi.me()).age >= EDU_MIN_AGE;
  },
  async modules(): Promise<ModuleStatus[]> {
    const prog = await eduProgress(myId());
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
    const status = (await realApi.modules()).find((m) => m.slug === slug) || fail('Módulo não encontrado.');
    if (status.state === 'locked') fail('Conclua o módulo anterior para liberar este.');
    return { module: EDU.find((m) => m.slug === slug)!, status };
  },
  async submitQuiz(slug: string, answers: number[]): Promise<QuizResult> {
    const status = (await realApi.modules()).find((x) => x.slug === slug) || fail('Módulo não encontrado.');
    if (status.state === 'locked') fail('Módulo bloqueado.');
    const m = EDU.find((x) => x.slug === slug)!;
    const id = (await moduleIdMap())[slug] || fail('Este módulo ainda não está no servidor.');
    const clean = m.questions.map((_, i) => (Number.isInteger(answers[i]) ? answers[i] : -1));
    const r = await sb.rpc<Row>('submit_quiz', { p_module: id, p_answers: clean });
    const wrong: QuizResult['wrong'] = [];
    (r.results as Row[]).forEach((x, i) => {
      if (!x.correct) wrong.push({ index: i, chosen: clean[i], answer: x.correct_index });
    });
    return { correct: r.score, total: r.total, passed: !!r.passed, xp: r.xp_awarded || 0, wrong };
  },

  // ---------- responsável ----------
  async parentName(): Promise<string> {
    const rows = await sb.rest<Row[]>(`profiles?id=eq.${uid()}&select=full_name`);
    return rows[0]?.full_name || 'Responsável';
  },
  async parentEmail(): Promise<string> {
    return sb.getTokens()?.user.email || '';
  },
  async children(): Promise<Child[]> {
    return loadChildren();
  },
  async child(id: string): Promise<Child> {
    return oneChild(id);
  },
  async createChild(input: { name: string; age: number; username: string; password: string }): Promise<Child> {
    const name = input.name.trim();
    const username = input.username.trim().toLowerCase();
    if (!name) fail('Informe o nome do filho(a).');
    if (!(input.age >= 7 && input.age <= 18)) fail('A idade deve ser entre 7 e 18 anos.');
    if (!validUser(username)) fail('O usuário deve ter de 3 a 20 letras minúsculas, números, ponto ou _ (sem espaços).');
    if (input.password.length < 6) fail('A senha deve ter no mínimo 6 caracteres.');
    const c = await sb.adminAction<Row>('create-child', { name, age: input.age, username, password: input.password });
    return { id: c.id, name, age: input.age, username, balance: 0, lifetime: 0, level: 1, streak: 0, lastActive: null };
  },
  async updateChild(id: string, input: { name: string; age: number; username: string }) {
    const username = input.username.trim().toLowerCase();
    if (!input.name.trim()) fail('Informe o nome.');
    if (!(input.age >= 7 && input.age <= 18)) fail('A idade deve ser entre 7 e 18 anos.');
    if (!validUser(username)) fail('Usuário inválido (3 a 20 letras minúsculas, números, ponto ou _).');
    await sb.adminAction('update-child', { id, name: input.name.trim(), age: input.age, username });
  },
  async resetChildPassword(id: string, password: string) {
    if (password.length < 6) fail('A senha deve ter no mínimo 6 caracteres.');
    await sb.adminAction('reset-password', { id, password });
  },
  async removeChild(id: string) {
    await sb.adminAction('delete-child', { id });
  },

  async tasks(): Promise<Task[]> {
    return (await sb.rest<Row[]>('tasks?active=eq.true&select=*&order=created_at.asc')).map(mapTask);
  },
  async task(id: string): Promise<Task> {
    const rows = await sb.rest<Row[]>(`tasks?id=eq.${id}&select=*`);
    return rows[0] ? mapTask(rows[0]) : fail('Tarefa não encontrada.');
  },
  async saveTask(input: Partial<Task> & { title: string; xp: number; childId: string }) {
    const title = input.title.trim();
    if (!title) fail('Informe o título da tarefa.');
    if (!(input.xp > 0 && input.xp <= 5000)) fail('O XP deve ser um número entre 1 e 5000.');
    if (!input.childId) fail('Escolha para quem é a tarefa.');
    const body = (childId: string) => ({ title, description: input.description || null, xp: input.xp, child_id: childId, recurrence: input.repeat || 'daily', require_photo: !!input.needsPhoto });
    if (input.id) {
      await sb.rest(`tasks?id=eq.${input.id}`, { method: 'PATCH', body: body(input.childId === 'all' ? (await realApi.task(input.id)).childId : input.childId) });
      return;
    }
    const targets = input.childId === 'all' ? (await loadChildren()).map((c) => c.id) : [input.childId];
    if (!targets.length) fail('Cadastre um membro antes de criar tarefas.');
    await sb.rest('tasks', { method: 'POST', body: targets.map((c) => ({ ...body(c), parent_id: uid() })) });
  },
  async deleteTask(id: string) {
    await sb.rest(`tasks?id=eq.${id}`, { method: 'PATCH', body: { active: false } });
  },
  async rewards(): Promise<Reward[]> {
    return (await sb.rest<Row[]>('rewards?active=eq.true&select=*&order=created_at.asc')).map(mapReward);
  },
  async saveReward(input: Partial<Reward> & { title: string; cost: number }) {
    const title = input.title.trim();
    if (!title) fail('Informe o nome da recompensa.');
    if (!(input.cost > 0 && input.cost <= 20000)) fail('O custo deve ser um número entre 1 e 20000 XP.');
    const childId = input.childId && input.childId !== 'all' ? input.childId : null;
    const body = { title, description: input.description || null, cost_xp: input.cost, icon: input.icon || 'gift', child_id: childId };
    if (input.id) await sb.rest(`rewards?id=eq.${input.id}`, { method: 'PATCH', body });
    else await sb.rest('rewards', { method: 'POST', body: { ...body, parent_id: uid() } });
  },
  async deleteReward(id: string) {
    await sb.rest(`rewards?id=eq.${id}`, { method: 'PATCH', body: { active: false } });
  },
  async redemptionsAll(): Promise<(Redemption & { reward?: Reward; child?: Child })[]> {
    const [rows, kids] = await Promise.all([sb.rest<Row[]>('redemptions?select=*,rewards(*)&order=created_at.desc&limit=200'), loadChildren()]);
    return rows.map((r) => ({ ...mapRedemption(r), reward: r.rewards ? mapReward(r.rewards) : undefined, child: kids.find((k) => k.id === r.child_id) }));
  },
  async markDelivered(id: string) {
    await sb.rpc('mark_redemption_delivered', { p_id: id });
  },
  async submissions(status: Submission['status'] = 'pending'): Promise<(Submission & { task?: Task; child?: Child })[]> {
    const [rows, kids] = await Promise.all([sb.rest<Row[]>(`task_submissions?status=eq.${status}&select=*,tasks(*)&order=submitted_at.desc&limit=200`), loadChildren()]);
    const photos = await Promise.all(rows.map((r) => (r.photo_path ? sb.signedPhotoUrl(r.photo_path) : Promise.resolve(undefined))));
    return rows.map((r, i) => ({ ...mapSub(r, photos[i]), task: r.tasks ? mapTask(r.tasks) : undefined, child: kids.find((k) => k.id === r.child_id) }));
  },
  async approve(id: string) {
    await sb.rpc('approve_submission', { p_id: id });
  },
  async reject(id: string, reason: string) {
    await sb.rpc('reject_submission', { p_id: id, p_reason: reason.trim() || null });
  },
  async childDetail(id: string): Promise<{ child: Child; week: { label: string; xp: number }[]; weekTotal: number; recent: LedgerEntry[] }> {
    const [child, rows] = await Promise.all([oneChild(id), sb.rest<Row[]>(`xp_ledger?child_id=eq.${id}&select=*&order=created_at.desc&limit=500`)]);
    const ledger = rows.map(mapLedger);
    const labels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    const week: { label: string; xp: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const t = Date.now() - i * DAY;
      const key = localDayKey(t);
      week.push({ label: labels[new Date(t).getDay()], xp: ledger.filter((e) => e.delta > 0 && localDayKey(e.createdAt) === key).reduce((a, e) => a + e.delta, 0) });
    }
    return { child, week, weekTotal: week.reduce((a, w) => a + w.xp, 0), recent: ledger.slice(0, 6) };
  },
  async reports(period: 'week' | 'month'): Promise<{ total: number; tasks: number; perChild: { child: Child; xp: number }[] }> {
    const since = new Date(Date.now() - (period === 'week' ? 7 : 30) * DAY).toISOString();
    const [kids, led, subs] = await Promise.all([
      loadChildren(),
      sb.rest<Row[]>(`xp_ledger?delta=gt.0&created_at=gte.${q(since)}&select=child_id,delta&limit=5000`),
      sb.rest<Row[]>(`task_submissions?status=eq.approved&reviewed_at=gte.${q(since)}&select=id&limit=5000`),
    ]);
    const perChild = kids.map((c) => ({ child: c, xp: led.filter((l) => l.child_id === c.id).reduce((a, l) => a + l.delta, 0) }));
    return { total: perChild.reduce((a, c) => a + c.xp, 0), tasks: subs.length, perChild };
  },
  async pendingCount(): Promise<number> {
    return (await sb.rest<Row[]>('task_submissions?status=eq.pending&select=id&limit=500')).length;
  },
  async exportData(): Promise<string> {
    const get = (p: string) => sb.rest<Row[]>(p);
    const [profile, kids, tasks, rewards, subs, reds, ledger, attempts] = await Promise.all([
      get(`profiles?id=eq.${uid()}&select=id,full_name,consent_at,created_at`),
      get('profiles?role=eq.child&select=id,full_name,username,age,created_at'),
      get('tasks?select=*'),
      get('rewards?select=*'),
      get('task_submissions?select=id,task_id,child_id,status,note,reject_reason,xp_awarded,submitted_at,reviewed_at'),
      get('redemptions?select=*'),
      get('xp_ledger?select=*&order=created_at.desc&limit=5000'),
      get('edu_attempts?select=id,child_id,module_id,score,total,passed,created_at'),
    ]);
    return JSON.stringify({ exportado_em: new Date().toISOString(), responsavel: { ...profile[0], email: sb.getTokens()?.user.email }, filhos: kids, tarefas: tasks, recompensas: rewards, envios: subs, resgates: reds, extrato_xp: ledger, provas: attempts }, null, 2);
  },
  async deleteAccount() {
    await sb.adminAction('delete-account');
    await sb.signOut();
    setSession(null);
  },

  // ---------- conta ----------
  async loginParent(email: string, password: string) {
    await sb.signIn(email.trim(), password);
    const rows = await sb.rest<Row[]>(`profiles?id=eq.${uid()}&select=role,full_name`);
    const p = rows[0];
    if (!p) {
      await sb.signOut();
      throw new AppError('Não encontramos o perfil desta conta. Fale com o suporte do projeto.');
    }
    if (p.role !== 'parent') {
      await sb.signOut();
      throw new AppError('Esta conta é de um filho. Use “Entrar com usuário e senha” na tela de entrada dos filhos.');
    }
    setSession({ mode: 'real', role: 'parent', name: p.full_name });
  },
  async loginChild(username: string, password: string) {
    await sb.signIn(sb.childEmail(username), password);
    const rows = await sb.rest<Row[]>(`profiles?id=eq.${uid()}&select=role,full_name`);
    const p = rows[0];
    if (!p || p.role !== 'child') {
      await sb.signOut();
      throw new AppError('Usuário ou senha incorretos.');
    }
    setSession({ mode: 'real', role: 'kid', childId: uid(), name: p.full_name });
  },
  /** Cadastro do responsável (com o consentimento da LGPD). Devolve `confirm: true` se o e-mail precisa ser confirmado. */
  async signupParent(input: { name: string; email: string; password: string }): Promise<{ confirm: boolean }> {
    const t = await sb.signUp(input.email.trim(), input.password, { full_name: input.name.trim(), consent: 'true' });
    if (!t) return { confirm: true };
    setSession({ mode: 'real', role: 'parent', name: input.name.trim() });
    return { confirm: false };
  },
  async saveOnboarding(data: Record<string, unknown>) {
    try {
      await sb.updateUser({ data });
    } catch {
      /* opcional: não atrapalha o cadastro */
    }
  },
  async forgotPassword(email: string) {
    await sb.recover(email.trim());
  },
  async setNewPassword(password: string) {
    await sb.updateUser({ password });
    const rows = await sb.rest<Row[]>(`profiles?id=eq.${uid()}&select=role,full_name`);
    const p = rows[0];
    if (p?.role === 'parent') setSession({ mode: 'real', role: 'parent', name: p.full_name });
  },
  /** Depois de confirmar o e-mail: transforma o login do Supabase em sessão do app. */
  async restoreSession() {
    if (!sb.getTokens()) return;
    const rows = await sb.rest<Row[]>(`profiles?id=eq.${uid()}&select=role,full_name`);
    const p = rows[0];
    if (p?.role === 'parent') setSession({ mode: 'real', role: 'parent', name: p.full_name });
  },
  async logout() {
    await sb.signOut();
    setSession(null);
  },
};
