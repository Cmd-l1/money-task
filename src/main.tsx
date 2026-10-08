import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initPwa } from './lib/pwa';
import { captureAuthFragment, getTokens, sbConfigured } from './lib/sb';
import { getSession, setSession } from './lib/core';
import { realApi } from './lib/realApi';
import { toast } from './ui/kit';
import './styles.css';

async function boot() {
  initPwa();
  let notice = '';
  if (sbConfigured) {
    // links dos e-mails do Supabase (confirmar cadastro / nova senha) chegam com os tokens no endereço
    const r = await captureAuthFragment().catch(() => null);
    if (r && 'error' in r) notice = r.error;
    else if (r && 'type' in r) {
      if (r.type === 'recovery') location.hash = '#/nova-senha';
      else {
        await realApi.restoreSession().catch(() => undefined);
        location.hash = '#/pai';
      }
    }
    // sessão "real" sem login válido guardado: volta para a entrada
    if (getSession()?.mode === 'real' && !getTokens()) setSession(null);
  }
  createRoot(document.getElementById('root')!).render(<App />);
  if (notice) setTimeout(() => toast(notice, 'error'), 400);
}
void boot();
