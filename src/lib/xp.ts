// Regras de XP e nível (as mesmas da função level_for() do banco de dados).
export const LEVEL_STEPS = [0, 250, 750, 1500, 2500, 4000];

export function levelFor(lifetime: number): number {
  let lvl = 1;
  for (let i = 1; i < LEVEL_STEPS.length; i++) if (lifetime >= LEVEL_STEPS[i]) lvl = i + 1;
  return lvl;
}
export function levelProgress(lifetime: number) {
  const level = levelFor(lifetime);
  const from = LEVEL_STEPS[level - 1];
  const to = level >= LEVEL_STEPS.length ? null : LEVEL_STEPS[level];
  const pct = to === null ? 100 : Math.min(100, Math.round(((lifetime - from) / (to - from)) * 100));
  return { level, from, to, pct, missing: to === null ? 0 : to - lifetime };
}
export const PASS_RATIO = 0.7; // 70% de acertos para passar na prova
export const EDU_MIN_AGE = 16;
export const MODULE_XP = 100;
