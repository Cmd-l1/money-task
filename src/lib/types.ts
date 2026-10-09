export type Role = 'parent' | 'kid';
export type Mode = 'demo' | 'real';

export interface Session {
  mode: Mode;
  role: Role;
  childId?: string; // quando role === 'kid'
  name?: string;
}

export interface Child {
  id: string;
  name: string;
  age: number;
  username: string;
  balance: number; // XP disponível
  lifetime: number; // XP acumulado em toda a vida
  level: number;
  streak: number;
  lastActive?: string | null; // yyyy-mm-dd do último dia com tarefa aprovada
}

export type Repeat = 'once' | 'daily' | 'weekly';
export interface Task {
  id: string;
  title: string;
  description: string;
  xp: number;
  childId: string | 'all';
  repeat: Repeat;
  needsPhoto: boolean;
  icon: string;
  active: boolean;
  dueAt?: number | null; // prazo (ms); vale para tarefas de uma vez
  penalty?: number; // XP perdido se o prazo passar sem fazer
  groupId?: string | null; // tarefa conjunta: mesmo grupo para todos os membros
}
export type SubStatus = 'pending' | 'approved' | 'rejected';
export interface Submission {
  id: string;
  taskId: string;
  childId: string;
  status: SubStatus;
  photo?: string;
  reason?: string;
  createdAt: number;
  decidedAt?: number;
}
export interface Reward {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: string;
  childId: string | 'all';
  active: boolean;
  expiresAt?: number | null; // prazo para resgatar (ms)
}
export interface Redemption {
  id: string;
  rewardId: string;
  childId: string;
  cost: number;
  status: 'pending' | 'delivered';
  createdAt: number;
}
export interface LedgerEntry {
  id: string;
  childId: string;
  delta: number;
  reason: string;
  createdAt: number;
}
export interface Achievement {
  code: string;
  title: string;
  hint: string;
  icon: string;
  unlocked: boolean;
}
export interface EduModule {
  slug: string;
  order: number;
  title: string;
  summary: string;
  lessons: Lesson[];
  questions: Question[];
}
export interface Lesson { title: string; paragraphs: string[]; example?: string }
export interface Question { prompt: string; options: string[]; answer: number; explanation: string }
export interface ModuleStatus {
  slug: string;
  title: string;
  summary: string;
  order: number;
  state: 'done' | 'current' | 'locked';
  bestScore?: number;
  lessons: number;
}
export interface QuizResult { correct: number; total: number; passed: boolean; xp: number; wrong: { index: number; chosen: number; answer: number }[] }
