// Cliente mínimo do Supabase usando só fetch (sem bibliotecas): login, tabelas, funções, fotos.
import { AppError, bump } from './core';

export const SB_URL: string = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
/** Contas reais só funcionam quando o endereço e a chave do Supabase estão no build. */
export const sbConfigured = !!SB_URL && !!SB_KEY;

export const CHILD_EMAIL_DOMAIN = 'filho.moneytask.app';
export const childEmail = (username: string) => `${username.trim().toLowerCase()}@${CHILD_EMAIL_DOMAIN}`;

export interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // segundos (unix)
  user: { id: string; email?: string };
}

// ---------- tokens ----------
const TKEY = 'mt-sb-auth';
let tokens: Tokens | null = null;
export function getTokens(): Tokens | null {
  if (tokens) return tokens;
  try {
    const raw = localStorage.getItem(TKEY);
    if (raw) tokens = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return tokens;
}
export function saveTokens(t: Tokens | null) {
  tokens = t;
  try {
    if (t) localStorage.setItem(TKEY, JSON.stringify(t));
    else localStorage.removeItem(TKEY);
  } catch {
    /* ignore */
  }
}
export const myUserId = () => getTokens()?.user.id || '';

// ---------- erros em português ----------
function friendly(status: number, body: any, fallback: string): string {
  const code = String(body?.error_code || body?.code || '');
  const msg = String(body?.msg || body?.message || body?.error_description || body?.error || '');
  const low = msg.toLowerCase();
  if (code === 'invalid_credentials' || low.includes('invalid login credentials')) return 'E-mail, usuário ou senha incorretos.';
  if (code === 'user_already_exists' || low.includes('already registered') || low.includes('already been registered')) return 'Este e-mail já tem cadastro. Entre ou redefina a senha.';
  if (code === 'weak_password' || low.includes('password should be')) return 'Senha muito fraca. Use pelo menos 8 caracteres, com letras e números.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (code === 'email_not_confirmed' || low.includes('email not confirmed')) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (code === 'validation_failed' || low.includes('unable to validate email')) return 'Digite um e-mail válido.';
  if (code === 'same_password' || low.includes('different from the old')) return 'A nova senha precisa ser diferente da atual.';
  if (status === 401 || code === 'PGRST301' || low.includes('jwt')) return 'Sua sessão expirou. Entre de novo.';
  if (code === '23505') return 'Esse registro já existe.';
  if (code === '42501' || low.includes('row-level security')) return 'Você não tem permissão para isso.';
  if (msg && /[áâãéêíóôõúç]/i.test(msg)) return msg; // mensagens das regras do banco já vêm em português
  return fallback;
}

async function raw(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new AppError('Sem conexão com o servidor. Verifique sua internet e tente de novo.');
  }
}
async function parse(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
function toError(res: Response, body: any, fallback: string): AppError {
  return new AppError(friendly(res.status, body, fallback));
}

// ---------- login (GoTrue) ----------
const baseHeaders = (): Record<string, string> => ({ apikey: SB_KEY, 'Content-Type': 'application/json' });

function toTokens(b: any): Tokens {
  return {
    access_token: b.access_token,
    refresh_token: b.refresh_token,
    expires_at: b.expires_at || Math.floor(Date.now() / 1000) + (b.expires_in || 3600),
    user: { id: b.user?.id, email: b.user?.email },
  };
}

export async function signIn(email: string, password: string): Promise<Tokens> {
  const res = await raw(`${SB_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: baseHeaders(), body: JSON.stringify({ email, password }) });
  const body = await parse(res);
  if (!res.ok) throw toError(res, body, 'Não foi possível entrar. Tente de novo.');
  const t = toTokens(body);
  saveTokens(t);
  return t;
}

/** Cadastra o responsável. Devolve os tokens quando o projeto não exige confirmação por e-mail. */
export async function signUp(email: string, password: string, data: Record<string, unknown>): Promise<Tokens | null> {
  const res = await raw(`${SB_URL}/auth/v1/signup`, { method: 'POST', headers: baseHeaders(), body: JSON.stringify({ email, password, data }) });
  const body = await parse(res);
  if (!res.ok) throw toError(res, body, 'Não foi possível criar a conta. Tente de novo.');
  if (body?.access_token) {
    const t = toTokens(body);
    saveTokens(t);
    return t;
  }
  // Com confirmação de e-mail ligada, o Supabase só devolve o usuário.
  // Se o e-mail já existir, ele devolve um usuário "sem identidades" (para não revelar quem tem conta).
  if (body && Array.isArray(body.identities) && body.identities.length === 0) throw new AppError('Este e-mail já tem cadastro. Entre ou redefina a senha.');
  return null;
}

export async function recover(email: string) {
  const redirect = encodeURIComponent(location.origin + location.pathname);
  const res = await raw(`${SB_URL}/auth/v1/recover?redirect_to=${redirect}`, { method: 'POST', headers: baseHeaders(), body: JSON.stringify({ email }) });
  if (!res.ok) throw toError(res, await parse(res), 'Não foi possível enviar o e-mail agora. Tente de novo.');
}

async function refresh(t: Tokens): Promise<Tokens | null> {
  // outra aba/chamada pode já ter renovado: o refresh token é de uso único
  const cur = getTokens();
  if (cur && cur.refresh_token !== t.refresh_token && cur.expires_at - 30 > Date.now() / 1000) return cur;
  const res = await raw(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: baseHeaders(), body: JSON.stringify({ refresh_token: t.refresh_token }) });
  if (!res.ok) return null;
  const nt = toTokens(await parse(res));
  saveTokens(nt);
  return nt;
}
let refreshing: Promise<Tokens | null> | null = null;
function singleRefresh(t: Tokens): Promise<Tokens | null> {
  refreshing = refreshing || refresh(t).finally(() => (refreshing = null));
  return refreshing;
}
async function accessToken(): Promise<string> {
  let t = getTokens();
  if (!t) throw new AppError('Sua sessão expirou. Entre de novo.');
  if (t.expires_at - 30 < Date.now() / 1000) {
    t = await singleRefresh(t);
    if (!t) {
      saveTokens(null);
      throw new AppError('Sua sessão expirou. Entre de novo.');
    }
  }
  return t.access_token;
}

export async function updateUser(attrs: { password?: string; data?: Record<string, unknown> }) {
  const res = await raw(`${SB_URL}/auth/v1/user`, { method: 'PUT', headers: { ...baseHeaders(), Authorization: `Bearer ${await accessToken()}` }, body: JSON.stringify(attrs) });
  if (!res.ok) throw toError(res, await parse(res), 'Não foi possível salvar. Tente de novo.');
}

export async function signOut() {
  const t = getTokens();
  saveTokens(null);
  cache.clear();
  if (!t) return;
  try {
    await fetch(`${SB_URL}/auth/v1/logout?scope=local`, { method: 'POST', headers: { ...baseHeaders(), Authorization: `Bearer ${t.access_token}` } });
  } catch {
    /* sem internet: a sessão local já foi apagada */
  }
}

/** Lê os tokens que o Supabase coloca no endereço depois do link do e-mail (confirmação ou nova senha). */
export async function captureAuthFragment(): Promise<{ type: string } | { error: string } | null> {
  const h = location.hash;
  if (!h.startsWith('#') || h.startsWith('#/')) return null;
  const p = new URLSearchParams(h.slice(1));
  const err = p.get('error_description') || p.get('error');
  const at = p.get('access_token');
  history.replaceState(null, '', location.pathname + location.search + '#/');
  if (err) return { error: err.toLowerCase().includes('expired') ? 'O link expirou. Peça um novo.' : 'O link não é válido. Peça um novo.' };
  if (!at) return null;
  const res = await raw(`${SB_URL}/auth/v1/user`, { headers: { ...baseHeaders(), Authorization: `Bearer ${at}` } });
  if (!res.ok) return { error: 'O link não é válido. Peça um novo.' };
  const u = await parse(res);
  saveTokens({
    access_token: at,
    refresh_token: p.get('refresh_token') || '',
    expires_at: Number(p.get('expires_at')) || Math.floor(Date.now() / 1000) + Number(p.get('expires_in') || 3600),
    user: { id: u.id, email: u.email },
  });
  return { type: p.get('type') || 'signup' };
}

// ---------- tabelas (PostgREST) com cache curto para evitar pedidos repetidos ----------
const cache = new Map<string, { at: number; p: Promise<any> }>();
export function clearCache() {
  cache.clear();
}

async function authed(path: string, init: RequestInit & { retry?: boolean } = {}): Promise<Response> {
  const headers = { ...baseHeaders(), Authorization: `Bearer ${await accessToken()}`, ...(init.headers as Record<string, string> | undefined) };
  const res = await raw(`${SB_URL}${path}`, { ...init, headers });
  if (res.status === 401 && !init.retry) {
    const t = getTokens();
    if (t && (await singleRefresh(t))) return authed(path, { ...init, retry: true });
  }
  return res;
}

export async function rest<T = any>(path: string, opts: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; returning?: boolean } = {}): Promise<T> {
  const method = opts.method || 'GET';
  const run = async () => {
    const headers: Record<string, string> = {};
    if (method !== 'GET') headers.Prefer = opts.returning ? 'return=representation' : 'return=minimal';
    const res = await authed(`/rest/v1/${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
    const body = await parse(res);
    if (!res.ok) throw toError(res, body, 'Não foi possível carregar os dados. Tente de novo.');
    return body as T;
  };
  if (method === 'GET') {
    const hit = cache.get(path);
    if (hit && Date.now() - hit.at < 1500) return hit.p;
    const p = run();
    cache.set(path, { at: Date.now(), p });
    p.catch(() => cache.delete(path));
    return p;
  }
  cache.clear();
  try {
    return await run();
  } finally {
    cache.clear();
    bump();
  }
}

export async function rpc<T = any>(name: string, args: Record<string, unknown> = {}, opts: { quiet?: boolean } = {}): Promise<T> {
  cache.clear();
  try {
    const res = await authed(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(args) });
    const body = await parse(res);
    if (!res.ok) throw toError(res, body, 'Não foi possível concluir a ação. Tente de novo.');
    return body as T;
  } finally {
    cache.clear();
    if (!opts.quiet) bump();
  }
}

// ---------- funções seguras do servidor (criar filho, trocar senha, excluir) ----------
export async function adminAction<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  cache.clear();
  try {
    let res: Response;
    try {
      res = await authed('/functions/v1/admin', { method: 'POST', body: JSON.stringify({ action, ...payload }) });
    } catch (e) {
      if (e instanceof AppError && e.message.startsWith('Sem conexão') && navigator.onLine)
        throw new AppError('Não consegui falar com a função "admin" do Supabase. Confira se ela foi criada com esse nome exato e se "Verify JWT" está desligado (veja supabase/LEIA-ME.md).');
      throw e;
    }
    const body = await parse(res);
    if (res.status === 404 && typeof body?.error !== 'string') throw new AppError('A função de servidor ainda não foi ativada no Supabase. Veja supabase/LEIA-ME.md.');
    if (!res.ok) throw new AppError(typeof body?.error === 'string' ? body.error : friendly(res.status, body, 'Não foi possível concluir a ação. Tente de novo.'));
    return body as T;
  } finally {
    cache.clear();
    bump();
  }
}

// ---------- fotos (armazenamento privado) ----------
export async function uploadPhoto(path: string, blob: Blob) {
  cache.clear();
  const res = await authed(`/storage/v1/object/task-photos/${path}`, { method: 'POST', headers: { 'Content-Type': blob.type || 'image/jpeg', 'x-upsert': 'false' }, body: blob });
  if (!res.ok) throw toError(res, await parse(res), 'Não foi possível enviar a foto. Tente de novo.');
}
export async function signedPhotoUrl(path: string): Promise<string | undefined> {
  try {
    const res = await authed(`/storage/v1/object/sign/task-photos/${path}`, { method: 'POST', body: JSON.stringify({ expiresIn: 3600 }) });
    if (!res.ok) return undefined;
    const b = await parse(res);
    const u: string = b.signedURL || b.signedUrl;
    if (!u) return undefined;
    return u.startsWith('http') ? u : `${SB_URL}/storage/v1${u.startsWith('/') ? '' : '/'}${u}`;
  } catch {
    return undefined;
  }
}
