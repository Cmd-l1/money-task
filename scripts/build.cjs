// Build do money task: esbuild empacota o app e gera dist/ pronto para o GitHub Pages.
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const http = require('http');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const serve = process.argv.includes('--serve');

function loadEnv() {
  const env = {};
  for (const f of ['.env', '.env.local']) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  // Variáveis do ambiente (GitHub Actions) têm prioridade
  for (const k of Object.keys(process.env)) if (k.startsWith('VITE_')) env[k] = process.env[k];
  return env;
}

async function main() {
  const env = loadEnv();
  const version = Date.now().toString(36);
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });

  const define = { 'process.env.NODE_ENV': '"production"' };
  for (const k of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']) {
    define[`import.meta.env.${k}`] = JSON.stringify(env[k] || '');
  }
  define['import.meta.env.VITE_APP_VERSION'] = JSON.stringify(version);

  const opts = {
    entryPoints: [path.join(root, 'src/main.tsx')],
    bundle: true,
    minify: true,
    sourcemap: false,
    target: 'es2022',
    outdir: path.join(dist, 'assets'),
    entryNames: 'app',
    define,
    loader: { '.svg': 'dataurl' },
    logLevel: 'info',
  };
  await esbuild.build(opts);

  // public/ -> dist/
  for (const f of fs.readdirSync(path.join(root, 'public'))) {
    fs.cpSync(path.join(root, 'public', f), path.join(dist, f), { recursive: true });
  }
  // versão no service worker (invalida o cache a cada build)
  const swPath = path.join(dist, 'sw.js');
  fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace('__VERSION__', version));
  // index.html
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/__VERSION__/g, version);
  fs.writeFileSync(path.join(dist, 'index.html'), html);
  // 404.html = index (rotas por hash não precisam, mas ajuda em links diretos)
  fs.writeFileSync(path.join(dist, '404.html'), html);
  console.log('build ok · versão', version);

  if (serve) {
    const port = 5173;
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
    http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(dist, p);
      if (!file.startsWith(dist) || !fs.existsSync(file)) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    }).listen(port, () => console.log('http://localhost:' + port));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
