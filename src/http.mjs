import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.mjs';
import { createService } from './tools.mjs';
import { LabError, safeError } from './errors.mjs';

function equal(a, b) { const left = Buffer.from(a), right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right); }
export function createHttpServer(service, { runnerToken, maintainerToken, maxRequests = 120 } = {}) {
  if (![runnerToken, maintainerToken].every(t => typeof t === 'string' && /^[a-zA-Z0-9_-]{32,}$/.test(t)) || runnerToken === maintainerToken) throw new Error('Configure two distinct local tokens of at least 32 characters. Run npm run setup.');
  const budgets = new Map();
  const server = http.createServer(async (req, res) => {
    const reply = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(data));
    };
    try {
      if (req.headers.origin || !/^127\.0\.0\.1:\d+$/.test(req.headers.host || '')) throw new LabError('ORIGIN_OR_HOST_REJECTED', 403);
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      const role = equal(token, maintainerToken) ? 'maintainer' : equal(token, runnerToken) ? 'runner' : null;
      if (!role) throw new LabError('UNAUTHORIZED', 401);
      const minute = Math.floor(Date.now() / 60000);
      const budget = budgets.get(role);
      const count = budget?.minute === minute ? budget.count + 1 : 1;
      budgets.set(role, { minute, count });
      if (count > maxRequests) throw new LabError('RATE_LIMITED', 429);
      if (req.url === '/v1/tools' && req.method === 'GET') return reply(200, { tools: service.list(role) });
      const match = /^\/v1\/tools\/([a-z_]+)$/.exec(req.url || '');
      if (!match || req.method !== 'POST') throw new LabError('NOT_FOUND', 404);
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw new LabError('JSON_REQUIRED', 415);
      if (Number(req.headers['content-length'] || 0) > 65536) throw new LabError('BODY_TOO_LARGE', 413);
      let bytes = 0; const chunks = [];
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 65536) throw new LabError('BODY_TOO_LARGE', 413);
        chunks.push(chunk);
      }
      let args;
      try { args = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new LabError('INVALID_JSON', 400); }
      reply(200, await service.call(match[1], args, role));
    } catch (error) { if (!res.headersSent) reply(error instanceof LabError ? error.status : 500, safeError(error)); }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = resolve('.data'); mkdirSync(dir, { recursive: true });
  const lockPath = join(dir, 'gateway.lock');
  let lock;
  try { lock = openSync(lockPath, 'wx'); }
  catch { console.error('Gateway lock exists. Stop the other gateway, or inspect docs/operations.md before recovering a stale lock.'); process.exit(1); }
  let store;
  try {
    store = new Store(join(dir, 'lab.sqlite'));
    const service = createService(store);
    const server = createHttpServer(service, { runnerToken: process.env.LAB_RUNNER_TOKEN, maintainerToken: process.env.LAB_MAINTAINER_TOKEN });
    store.recoverInterrupted(); await service.resumePending();
    const port = Number(process.env.LAB_PORT || 4317);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('LAB_PORT must be between 1024 and 65535.');
    server.listen(port, '127.0.0.1', () => console.error('Automation Systems Lab listening on http://127.0.0.1:' + port));
    let stopping = false;
    async function stop() {
      if (stopping) return; stopping = true;
      server.close(async () => { await service.drain(); store.close(); closeSync(lock); unlinkSync(lockPath); });
      server.closeIdleConnections();
    }
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
    server.on('error', error => { console.error(error.code || 'SERVER_ERROR'); store.close(); closeSync(lock); unlinkSync(lockPath); process.exitCode = 1; });
  } catch (error) { console.error(error.message); store?.close(); closeSync(lock); unlinkSync(lockPath); process.exitCode = 1; }
}
