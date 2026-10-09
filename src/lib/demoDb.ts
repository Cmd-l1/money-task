// Banco de dados do modo demonstração: tudo fica no navegador (localStorage) e não é enviado a lugar nenhum.
import type { LedgerEntry, Reward, Redemption, Submission, Task } from './types';

export interface ChildRec {
  id: string;
  name: string;
  age: number;
  username: string;
  password: string;
  streak: number;
  bestStreak: number;
  lastActive: string | null; // yyyy-mm-dd
}
export interface Notice {
  id: string;
  childId: string;
  kind: 'approved' | 'rejected' | 'levelup' | 'achievement';
  title: string;
  text: string;
  taskId?: string;
  seen: boolean;
  createdAt: number;
}
export interface DemoDB {
  v: number;
  parentName: string;
  children: ChildRec[];
  tasks: Task[];
  submissions: Submission[];
  rewards: Reward[];
  redemptions: Redemption[];
  ledger: LedgerEntry[];
  notices: Notice[];
  edu: Record<string, Record<string, { best: number; done: boolean }>>;
  penalized?: string[]; // 'tarefa:membro' já descontados
  seq: number;
}

const KEY = 'mt-demo-db';
const DAY = 86400000;

export function dayKey(t = Date.now()): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Foto de exemplo (caderno com exercícios) para a demonstração. */
function samplePhoto(): string {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><rect width="640" height="420" fill="#d9c9a8"/><rect x="70" y="30" width="500" height="360" rx="10" fill="#fbf8ef" stroke="#b9a883" stroke-width="3"/>' +
    Array.from({ length: 9 }, (_, i) => `<line x1="100" y1="${90 + i * 32}" x2="540" y2="${90 + i * 32}" stroke="#bcd3e6" stroke-width="2"/>`).join('') +
    '<text x="100" y="75" font-family="Georgia,serif" font-size="26" fill="#27406b">Lista de exercícios</text>' +
    ['1) 12 × 8 = 96', '2) 3x + 5 = 20 → x = 5', '3) 45% de 200 = 90', '4) 7² − 9 = 40'].map((t, i) => `<text x="110" y="${118 + i * 64}" font-family="Georgia,serif" font-size="24" fill="#2b3f6d">${t}</text>`).join('') +
    '<text x="320" y="408" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#6b5f46">foto de exemplo da demonstração</text></svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function seed(): DemoDB {
  const now = Date.now();
  const n = (i: number) => `d${i}`;
  const L = (id: number, childId: string, delta: number, reason: string, daysAgo: number): LedgerEntry => ({ id: n(id), childId, delta, reason, createdAt: now - daysAgo * DAY - 3600000 });
  return {
    v: 1,
    seq: 100,
    parentName: 'Responsável',
    children: [
      { id: 'c-lucas', name: 'Lucas', age: 14, username: 'lucas14', password: 'lucas123', streak: 3, bestStreak: 3, lastActive: dayKey(now - DAY) },
      { id: 'c-mari', name: 'Mariana', age: 9, username: 'mari9', password: 'mari1234', streak: 1, bestStreak: 2, lastActive: dayKey(now - DAY) },
      { id: 'c-pedro', name: 'Pedro', age: 17, username: 'pedro17', password: 'pedro123', streak: 5, bestStreak: 5, lastActive: dayKey(now - DAY) },
    ],
    tasks: [
      { id: 't1', title: 'Estudar Matemática', description: 'Resolver a lista de exercícios.', xp: 300, childId: 'c-lucas', repeat: 'weekly', needsPhoto: true, icon: 'book', active: true },
      { id: 't2', title: 'Varrer a casa', description: 'Sala e cozinha.', xp: 200, childId: 'c-lucas', repeat: 'daily', needsPhoto: false, icon: 'home', active: true },
      { id: 't3', title: 'Lavar a louça', description: 'Depois do jantar.', xp: 200, childId: 'c-mari', repeat: 'daily', needsPhoto: false, icon: 'utensils', active: true },
      { id: 't4', title: 'Arrumar a cama', description: 'Antes de sair de casa.', xp: 50, childId: 'c-mari', repeat: 'daily', needsPhoto: false, icon: 'home', active: true },
      { id: 't5', title: 'Ler por 20 minutos', description: 'Qualquer livro.', xp: 100, childId: 'c-pedro', repeat: 'daily', needsPhoto: false, icon: 'book', active: true },
      { id: 't6', title: 'Arrumar o quarto', description: 'Roupas guardadas e mesa limpa.', xp: 150, childId: 'c-pedro', repeat: 'weekly', needsPhoto: false, icon: 'home', active: true },
    ],
    submissions: [
      { id: 's1', taskId: 't1', childId: 'c-lucas', status: 'pending', photo: samplePhoto(), createdAt: now - 3600000 },
      { id: 's2', taskId: 't4', childId: 'c-mari', status: 'approved', createdAt: now - DAY, decidedAt: now - DAY + 600000 },
    ],
    rewards: [
      { id: 'r1', title: 'Escolher o jantar', description: 'Você escolhe o cardápio de sábado.', cost: 100, icon: 'utensils', childId: 'all', active: true },
      { id: 'r2', title: '1 hora de videogame', description: 'Vale para um dia da semana.', cost: 300, icon: 'gamepad', childId: 'all', active: true },
      { id: 'r3', title: 'Ir ao cinema', description: 'Filme e pipoca com a família.', cost: 600, icon: 'film', childId: 'all', active: true },
    ],
    redemptions: [
      { id: 'x1', rewardId: 'r2', childId: 'c-lucas', cost: 300, status: 'pending', createdAt: now - 2 * DAY },
      { id: 'x2', rewardId: 'r3', childId: 'c-pedro', cost: 600, status: 'delivered', createdAt: now - DAY },
    ],
    ledger: [
      L(1, 'c-lucas', 100, 'Ler por 20 minutos', 6),
      L(2, 'c-lucas', 100, 'Arrumar o quarto', 5),
      L(4, 'c-lucas', 50, 'Arrumar a cama', 4),
      L(5, 'c-lucas', 150, 'Varrer a casa', 3),
      L(7, 'c-lucas', -300, 'Resgate: 1 hora de videogame', 2),
      L(8, 'c-lucas', 50, 'Varrer a casa', 1),
      L(20, 'c-mari', 50, 'Arrumar a cama', 3),
      L(21, 'c-mari', 60, 'Lavar a louça', 2),
      L(22, 'c-mari', 50, 'Arrumar a cama', 1),
      L(30, 'c-pedro', 150, 'Ler por 20 minutos', 6),
      L(31, 'c-pedro', 150, 'Arrumar o quarto', 5),
      L(32, 'c-pedro', 100, 'Ler por 20 minutos', 4),
      L(33, 'c-pedro', 100, 'Módulo: Dinheiro e orçamento', 3),
      L(34, 'c-pedro', 100, 'Módulo: Cartões', 2),
      L(35, 'c-pedro', 200, 'Arrumar o quarto', 1),
      L(36, 'c-pedro', -600, 'Resgate: Ir ao cinema', 1),
    ],
    notices: [],
    edu: {
      'c-pedro': { 'dinheiro-orcamento': { best: 5, done: true }, cartoes: { best: 4, done: true } },
    },
  };
}

let cache: DemoDB | null = null;
export function loadDb(): DemoDB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      cache = JSON.parse(raw) as DemoDB;
      return cache;
    }
  } catch {
    /* sem acesso ao armazenamento: segue com dados em memória */
  }
  cache = seed();
  return cache;
}
export function saveDb() {
  if (!cache) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* armazenamento cheio ou bloqueado: dados ficam só na memória */
  }
}
export function resetDb() {
  cache = seed();
  saveDb();
}
export function nextId(db: DemoDB, prefix: string): string {
  db.seq += 1;
  return `${prefix}${db.seq}`;
}
