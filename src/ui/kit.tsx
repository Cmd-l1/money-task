import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Icon } from './Icon';
import { back, navigate } from '../lib/router';
import { getVersion, subscribe, AppError } from '../lib/api';

// ---------- carregamento de dados ----------
export function useData<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const version = useSyncExternalStore(subscribe, getVersion);
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fn().then(
      (d) => {
        if (!alive) return;
        setData(d);
        setError(undefined);
        setLoading(false);
      },
      (e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Algo deu errado.');
        setLoading(false);
      }
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);
  return { data, error, loading };
}

/** Executa uma ação, mostra erro em toast e devolve true se deu certo. */
export async function run(fn: () => Promise<unknown> | unknown, okMsg?: string): Promise<boolean> {
  try {
    await fn();
    if (okMsg) toast(okMsg);
    return true;
  } catch (e) {
    toast(e instanceof AppError || e instanceof Error ? e.message : 'Algo deu errado.', 'error');
    return false;
  }
}

// ---------- toast ----------
let toastFn: ((m: string, k: 'ok' | 'error') => void) | null = null;
export function toast(msg: string, kind: 'ok' | 'error' = 'ok') {
  toastFn?.(msg, kind);
}
export function ToastHost() {
  const [t, setT] = useState<{ m: string; k: 'ok' | 'error'; id: number } | null>(null);
  useEffect(() => {
    let id = 0;
    toastFn = (m, k) => {
      id++;
      const mine = id;
      setT({ m, k, id: mine });
      setTimeout(() => setT((cur) => (cur && cur.id === mine ? null : cur)), 3200);
    };
    return () => {
      toastFn = null;
    };
  }, []);
  if (!t) return null;
  return (
    <div className={'toast ' + (t.k === 'error' ? 'error' : '')} role="status" aria-live="polite">
      <Icon name={t.k === 'error' ? 'alert' : 'check'} size={18} />
      <span>{t.m}</span>
    </div>
  );
}

// ---------- componentes base ----------
export function Button({ variant = 'primary', icon, small, children, ...rest }: { variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'danger-outline'; icon?: string; small?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`btn btn-${variant} ${small ? 'btn-sm' : ''} ${rest.className || ''}`}>
      {icon && <Icon name={icon} size={small ? 16 : 18} />}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error ? <span className="err">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function TextInput({ invalid, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...p} className={`input ${invalid ? 'invalid' : ''} ${p.className || ''}`} />;
}
export function PasswordInput(p: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input {...p} type={show ? 'text' : 'password'} className="input" />
      <button type="button" className="toggle" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
        <Icon name={show ? 'eyeoff' : 'eye'} size={20} />
      </button>
    </div>
  );
}

export function Alert({ variant = 'info', icon = 'info', title, children, action }: { variant?: 'info' | 'warning' | 'promo' | 'destructive' | 'success'; icon?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={`alert ${variant === 'info' ? '' : variant}`} role={variant === 'destructive' ? 'alert' : undefined}>
      <span className="alert-icon">
        <Icon name={icon} size={22} />
      </span>
      <div className="alert-body">
        <span className="alert-title">{title}</span>
        {children && <span className="alert-desc">{children}</span>}
      </div>
      {action}
    </div>
  );
}

export function Progress({ pct, small }: { pct: number; small?: boolean }) {
  return (
    <div className={`progress ${small ? 'sm' : ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="topbar">
      <button className="back" onClick={onBack || (() => back())} aria-label="Voltar">
        <Icon name="back" size={20} />
      </button>
      <h1>{title}</h1>
      {right}
    </div>
  );
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" ref={ref} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />;
}

export function Chip({ active, children, onClick, icon }: { active?: boolean; children: ReactNode; onClick?: () => void; icon?: string }) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag className={`chip ${active ? 'active' : ''}`} onClick={onClick}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </Tag>
  );
}

export function Loading() {
  return (
    <div className="col gap-16" aria-busy="true">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card col center" style={{ padding: 24, gap: 12 }}>
      <div className="tile lg">
        <Icon name={icon} size={28} />
      </div>
      <h3 className="t-h">{title}</h3>
      <p className="muted t-body">{text}</p>
      {action}
    </div>
  );
}

// ---------- barra de navegação ----------
export type NavItem = { key: string; label: string; icon: string; path: string };
export function BottomNav({ items, active }: { items: NavItem[]; active: string }) {
  const mid = Math.floor(items.length / 2);
  return (
    <nav className="nav" aria-label="Navegação principal">
      {items.map((it, i) => (
        <button key={it.key} className={`${it.key === active ? 'on' : ''} ${i === mid ? 'center' : ''}`} onClick={() => navigate(it.path)} aria-current={it.key === active ? 'page' : undefined}>
          {i === mid ? (
            <span className="bubble">
              <Icon name={it.icon} size={24} />
            </span>
          ) : (
            <Icon name={it.icon} size={24} />
          )}
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

export const when = (t: number) => {
  const d = new Date(t);
  const today = new Date();
  const yest = new Date(Date.now() - 86400000);
  const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `hoje, ${hm}`;
  if (d.toDateString() === yest.toDateString()) return `ontem, ${hm}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
};
export const xpText = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString('pt-BR')} XP`;
