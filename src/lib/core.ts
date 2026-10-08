// Núcleo compartilhado: erro do app, sessão e "versão" (avisa as telas para recarregar dados).
import type { Session } from './types';

export class AppError extends Error {}
export const fail = (m: string): never => {
  throw new AppError(m);
};

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
