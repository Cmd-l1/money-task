import { useEffect, useState } from 'react';

// Roteador por hash (#/caminho): funciona no GitHub Pages sem configuração de servidor.
export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h === '' ? '/' : h.split('?')[0];
}
export function currentQuery(): URLSearchParams {
  const h = window.location.hash;
  const i = h.indexOf('?');
  return new URLSearchParams(i >= 0 ? h.slice(i + 1) : '');
}
export function navigate(path: string, replace = false) {
  const target = '#' + path;
  if (replace) window.location.replace(target);
  else window.location.hash = target;
}
export function back(fallback = '/') {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback, true);
}
export function usePath(): string {
  const [p, setP] = useState(currentPath());
  useEffect(() => {
    const on = () => setP(currentPath());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return p;
}

export type Params = Record<string, string>;
export function matchRoute(pattern: string, path: string): Params | null {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}
