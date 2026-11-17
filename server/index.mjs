pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
import express from 'express';
import { mountCliDiscovery } from '../../packages/wao-cli/discovery.mjs';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mountWorkflow } from '../../packages/wao-core/index.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export function createApp({ dbPath = path.join(root, '.data/workspace.db'), keyFile = path.join(root, '.data/audit-key.pem') } = {}) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath), app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'same-origin'); next(); });
  const resources = JSON.parse(fs.readFileSync(path.join(root, 'server/resources.json'), 'utf8'));
  mountWorkflow(app, { db, assetsDir: path.resolve(root, '../packages/wao-core/public'), keyFile, product: 'Telcoin Builder WAO', namespace: 'telcoin', resources });
  app.get('/api/health', (_req, res) => res.json({ ok: true, product: 'Telcoin Builder WAO', environment: 'local', financialActions: false }));
  mountCliDiscovery(app, 'telcoin-builder-wao');
  app.use(express.static(path.join(root, 'public')));
  app.use((error, _req, res, _next) => { console.error(error.message); res.status(error.status || 500).json({ error: error.status === 413 ? 'Request body is too large' : 'Request could not be processed' }); });
  return { app, db };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { app } = createApp();
  const port = Number(process.env.PORT || 3101);
  app.listen(port, '127.0.0.1', () => console.log(`Telcoin Builder WAO local MVP: http://127.0.0.1:${port}`));
}
