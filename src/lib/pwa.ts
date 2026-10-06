// Registro do service worker e botão "Instalar app".
let deferred: any = null;
const subs = new Set<() => void>();

export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    subs.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    subs.forEach((f) => f());
  });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const canPrompt = () => !!deferred;
export async function installApp(): Promise<'accepted' | 'dismissed' | 'manual'> {
  if (deferred) {
    deferred.prompt();
    const r = await deferred.userChoice;
    deferred = null;
    subs.forEach((f) => f());
    return r.outcome;
  }
  return 'manual';
}
export function onInstallChange(fn: () => void) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** Reduz a foto para caber no armazenamento (máx. 720px, JPEG). */
export function shrinkImage(file: File, max = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a foto.'));
    };
    img.src = url;
  });
}
