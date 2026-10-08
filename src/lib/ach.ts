// Conquistas (as mesmas do banco de dados) e cálculo de sequência de dias.
export const ACH: { code: string; title: string; hint: string; icon: string }[] = [
  { code: 'first_task', title: 'Primeira tarefa', hint: 'Conclua uma tarefa', icon: 'check' },
  { code: 'streak_3', title: '3 dias seguidos', hint: 'Sequência de 3 dias', icon: 'flame' },
  { code: 'first_redeem', title: 'Primeiro resgate', hint: 'Troque XP por uma recompensa', icon: 'gift' },
  { code: 'xp_500', title: 'Meta de 500 XP', hint: 'Acumule 500 XP', icon: 'star' },
  { code: 'streak_7', title: '7 dias seguidos', hint: 'Sequência de 7 dias', icon: 'flame' },
  { code: 'study_master', title: 'Mestre dos estudos', hint: 'Conclua todos os módulos', icon: 'book' },
];

const DAY = 86400000;
export function localDayKey(t: number | Date): string {
  const d = typeof t === 'number' ? new Date(t) : t;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** A partir dos dias em que o filho ganhou XP, calcula a sequência atual e a melhor sequência. */
export function streakFromDays(days: Set<string>, now = Date.now()): { streak: number; best: number; lastActive: string | null } {
  if (days.size === 0) return { streak: 0, best: 0, lastActive: null };
  const sorted = [...days].sort();
  const lastActive = sorted[sorted.length - 1];
  const toNum = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return Math.round(new Date(y, m - 1, d, 12).getTime() / DAY);
  };
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = toNum(sorted[i]) - toNum(sorted[i - 1]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  // sequência atual: termina no último dia ativo; só vale se foi hoje ou ontem
  let cur = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    if (toNum(sorted[i]) - toNum(sorted[i - 1]) === 1) cur++;
    else break;
  }
  const alive = lastActive === localDayKey(now) || lastActive === localDayKey(now - DAY);
  return { streak: alive ? cur : 0, best, lastActive };
}
