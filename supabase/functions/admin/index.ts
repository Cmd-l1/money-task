// Função de servidor "admin" do money task (Supabase Edge Function).
// Só ela usa a chave de administrador (service role), que fica guardada no Supabase e NUNCA vai para o app.
// Ações (todas exigem um responsável logado): create-child, update-child, reset-password, delete-child, delete-account.
// Não usa bibliotecas externas: só fetch.

declare const Deno: { env: { get(k: string): string | undefined }; serve(h: (r: Request) => Response | Promise<Response>): void };

const CHILD_DOMAIN = 'filho.moneytask.app';
const MAX_CHILDREN = 10;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const baseUrl = () => (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
const serviceKey = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

async function svc(path: string, init: RequestInit = {}): Promise<Response> {
  const k = serviceKey();
  return fetch(`${baseUrl()}${path}`, { ...init, headers: { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) } });
}
async function table<T = any>(path: string): Promise<T[]> {
  const r = await svc(`/rest/v1/${path}`);
  if (!r.ok) throw new HttpError(500, 'Erro ao consultar o banco de dados.');
  return (await r.json()) as T[];
}

/** Descobre quem está chamando validando o token direto no Supabase Auth. */
async function caller(req: Request): Promise<string> {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) throw new HttpError(401, 'Entre para continuar.');
  const r = await fetch(`${baseUrl()}/auth/v1/user`, { headers: { apikey: serviceKey(), Authorization: auth } });
  if (!r.ok) throw new HttpError(401, 'Sua sessão expirou. Entre de novo.');
  const u = await r.json();
  if (!u?.id) throw new HttpError(401, 'Sua sessão expirou. Entre de novo.');
  return u.id as string;
}
async function requireParent(id: string) {
  const rows = await table<{ role: string }>(`profiles?id=eq.${id}&select=role`);
  if (rows[0]?.role !== 'parent') throw new HttpError(403, 'Apenas responsáveis podem fazer isso.');
}
async function requireMyChild(parentId: string, childId: unknown): Promise<{ id: string; username: string }> {
  if (typeof childId !== 'string' || !/^[0-9a-f-]{36}$/i.test(childId)) throw new HttpError(400, 'Membro inválido.');
  const rows = await table<{ id: string; username: string }>(`profiles?id=eq.${childId}&parent_id=eq.${parentId}&select=id,username`);
  if (!rows[0]) throw new HttpError(404, 'Membro não encontrado.');
  return rows[0];
}

const validUser = (u: unknown): u is string => typeof u === 'string' && /^[a-z0-9._]{3,20}$/.test(u);
const childEmail = (u: string) => `${u}@${CHILD_DOMAIN}`;
function validateName(n: unknown): string {
  const s = typeof n === 'string' ? n.trim() : '';
  if (!s || s.length > 60) throw new HttpError(400, 'Informe o nome (até 60 letras).');
  return s;
}
function validateAge(a: unknown): number {
  if (typeof a !== 'number' || !Number.isInteger(a) || a < 7 || a > 18) throw new HttpError(400, 'A idade deve ser entre 7 e 18 anos.');
  return a;
}
function validatePassword(p: unknown): string {
  if (typeof p !== 'string' || p.length < 6 || p.length > 72) throw new HttpError(400, 'A senha deve ter de 6 a 72 caracteres.');
  return p;
}

async function removeAuthUser(id: string) {
  // apaga as fotos do filho (melhor esforço) e depois a conta; o resto some em cascata
  try {
    const l = await svc('/storage/v1/object/list/task-photos', { method: 'POST', body: JSON.stringify({ prefix: `${id}/`, limit: 1000 }) });
    if (l.ok) {
      const files = ((await l.json()) as { name: string }[]).map((f) => `${id}/${f.name}`);
      if (files.length) await svc('/storage/v1/object/task-photos', { method: 'DELETE', body: JSON.stringify({ prefixes: files }) });
    }
  } catch {
    /* ignora */
  }
  const r = await svc(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 404) throw new HttpError(500, 'Não foi possível excluir a conta.');
}

async function createChild(parent: string, b: any) {
  const name = validateName(b.name);
  const age = validateAge(b.age);
  const username = validUser(b.username) ? b.username : (() => { throw new HttpError(400, 'O usuário deve ter de 3 a 20 letras minúsculas, números, ponto ou _.'); })();
  const password = validatePassword(b.password);

  const kids = await table(`profiles?parent_id=eq.${parent}&select=id&limit=${MAX_CHILDREN + 1}`);
  if (kids.length >= MAX_CHILDREN) throw new HttpError(400, `Limite de ${MAX_CHILDREN} membros por conta.`);
  if ((await table(`profiles?username=eq.${username}&select=id`)).length) throw new HttpError(409, 'Esse usuário já está em uso. Escolha outro.');

  const r = await svc('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email: childEmail(username), password, email_confirm: true, user_metadata: { role: 'child' } }) });
  const u = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 422 && String(u?.error_code || u?.msg || '').includes('exists')) throw new HttpError(409, 'Esse usuário já está em uso. Escolha outro.');
    if (String(u?.error_code || '') === 'weak_password') throw new HttpError(400, 'Senha muito fraca. Use pelo menos 6 caracteres.');
    throw new HttpError(500, 'Não foi possível criar a conta do membro.');
  }
  const p = await svc('/rest/v1/profiles', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, role: 'child', full_name: name, username, age, parent_id: parent }) });
  if (!p.ok) {
    await svc(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' });
    throw new HttpError(500, 'Não foi possível salvar o perfil do membro.');
  }
  return { id: u.id, name, age, username };
}

async function updateChild(parent: string, b: any) {
  const child = await requireMyChild(parent, b.id);
  const name = validateName(b.name);
  const age = validateAge(b.age);
  if (!validUser(b.username)) throw new HttpError(400, 'O usuário deve ter de 3 a 20 letras minúsculas, números, ponto ou _.');
  const username: string = b.username;
  const changed = username !== child.username;
  if (changed) {
    if ((await table(`profiles?username=eq.${username}&id=neq.${child.id}&select=id`)).length) throw new HttpError(409, 'Esse usuário já está em uso. Escolha outro.');
    const r = await svc(`/auth/v1/admin/users/${child.id}`, { method: 'PUT', body: JSON.stringify({ email: childEmail(username), email_confirm: true }) });
    if (!r.ok) throw new HttpError(409, 'Esse usuário já está em uso. Escolha outro.');
  }
  const p = await svc(`/rest/v1/profiles?id=eq.${child.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ full_name: name, age, username }) });
  if (!p.ok) {
    if (changed) await svc(`/auth/v1/admin/users/${child.id}`, { method: 'PUT', body: JSON.stringify({ email: childEmail(child.username), email_confirm: true }) });
    throw new HttpError(500, 'Não foi possível salvar as alterações.');
  }
  return { ok: true };
}

async function resetPassword(parent: string, b: any) {
  const child = await requireMyChild(parent, b.id);
  const password = validatePassword(b.password);
  const r = await svc(`/auth/v1/admin/users/${child.id}`, { method: 'PUT', body: JSON.stringify({ password }) });
  if (!r.ok) throw new HttpError(400, 'Não foi possível trocar a senha. Tente outra.');
  return { ok: true };
}

async function deleteChild(parent: string, b: any) {
  const child = await requireMyChild(parent, b.id);
  await removeAuthUser(child.id);
  return { ok: true };
}

async function deleteAccount(parent: string) {
  const kids = await table<{ id: string }>(`profiles?parent_id=eq.${parent}&select=id`);
  for (const k of kids) await removeAuthUser(k.id);
  await removeAuthUser(parent);
  return { ok: true };
}

export async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Método não permitido.' });
  try {
    if (!baseUrl() || !serviceKey()) throw new HttpError(500, 'Servidor sem configuração.');
    const parent = await caller(req);
    await requireParent(parent);
    const b = await req.json().catch(() => ({}));
    switch (b?.action) {
      case 'create-child': return json(200, await createChild(parent, b));
      case 'update-child': return json(200, await updateChild(parent, b));
      case 'reset-password': return json(200, await resetPassword(parent, b));
      case 'delete-child': return json(200, await deleteChild(parent, b));
      case 'delete-account': return json(200, await deleteAccount(parent));
      default: throw new HttpError(400, 'Ação desconhecida.');
    }
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.message });
    return json(500, { error: 'Erro inesperado. Tente de novo.' });
  }
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') Deno.serve(handle);
