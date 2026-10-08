// Fachada de dados do app. As telas só falam com `api`:
//  - modo demonstração: tudo local (demoApi);
//  - contas reais: Supabase (realApi), escolhido pela sessão de quem entrou.
import { AppError, bump, getSession, setSession } from './core';
import { demoApi } from './demoApi';
import { realApi } from './realApi';
import { sbConfigured } from './sb';
import { resetDb } from './demoDb';
import type { Mode } from './types';

export { AppError, bump, getSession, setSession, subscribe, getVersion } from './core';
export type { KidTask, TaskState } from './demoApi';
export { sbConfigured } from './sb';

type Shared = Omit<typeof demoApi, 'startDemo' | 'loginChild' | 'logout' | 'resetDemo'>;
interface Extra {
  mode: Mode;
  startDemo: typeof demoApi.startDemo;
  loginChild(username: string, password: string): Promise<void>;
  loginParent(email: string, password: string): Promise<void>;
  signupParent(input: { name: string; email: string; password: string }): Promise<{ confirm: boolean }>;
  saveOnboarding(data: Record<string, unknown>): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  setNewPassword(password: string): Promise<void>;
  parentEmail(): Promise<string>;
  logout(): Promise<void>;
  resetDemo(): void;
  deleteAccount(): Promise<void>;
}

const isDemoCred = (u: string, p: string) => {
  // contas de teste da demonstração (tela de entrada dos filhos), usadas só se a conta real não existir
  const x = u.trim().toLowerCase();
  return (x === 'lucas14' && p === 'lucas123') || (x === 'mari9' && p === 'mari1234') || (x === 'pedro17' && p === 'pedro123');
};

const extras: Extra = {
  get mode(): Mode {
    return getSession()?.mode === 'real' ? 'real' : 'demo';
  },
  startDemo: (role, childId) => demoApi.startDemo(role, childId),
  async loginChild(username, password) {
    if (!sbConfigured) return demoApi.loginChild(username, password);
    try {
      await realApi.loginChild(username, password);
    } catch (e) {
      if (isDemoCred(username, password)) return demoApi.loginChild(username, password);
      throw e;
    }
  },
  loginParent: (e, p) => realApi.loginParent(e, p),
  signupParent: (i) => realApi.signupParent(i),
  saveOnboarding: (d) => realApi.saveOnboarding(d),
  forgotPassword: (e) => realApi.forgotPassword(e),
  setNewPassword: (p) => realApi.setNewPassword(p),
  parentEmail: () => realApi.parentEmail(),
  async logout() {
    if (getSession()?.mode === 'real') await realApi.logout();
    else demoApi.logout();
  },
  resetDemo() {
    if (getSession()?.mode === 'real') return;
    demoApi.resetDemo();
  },
  async deleteAccount() {
    if (getSession()?.mode === 'real') await realApi.deleteAccount();
    else {
      resetDb();
      setSession(null);
    }
    bump();
  },
};

const pick = (): Shared => (getSession()?.mode === 'real' ? (realApi as unknown as Shared) : (demoApi as unknown as Shared));

export const api: Shared & Extra = new Proxy({} as Shared & Extra, {
  get(_t, key: string) {
    if (key in extras) return (extras as any)[key];
    return (pick() as any)[key];
  },
});

