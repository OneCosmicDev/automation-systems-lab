import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { automations, monthlyReport, incidentTriage } from '../src/automations.mjs';
import { Store } from '../src/store.mjs';
import { createService } from '../src/tools.mjs';
import { LabError } from '../src/errors.mjs';
const a = automations[0];
const request = (key = 'test:lead:001') => ({ automationId: a.id, input: a.example, idempotencyKey: key });

test('twenty concurrent submissions execute the business operation once', async () => {
  const store = new Store(); let executions = 0;
  const service = createService(store, { execute: async (a, input) => { executions++; await new Promise(r => setTimeout(r, 10)); return a.execute(input); } });
  const results = await Promise.all(Array.from({ length: 20 }, () => service.call('run_automation', request())));
  await service.drain();
  assert.equal(new Set(results.map(r => r.id)).size, 1);
  assert.equal(executions, 1);
  assert.equal(store.get(results[0].id).output.email, 'alex@example.com');
  store.close();
});
test('same key with changed payload conflicts, including across automation versions', () => {
  const store = new Store();
  store.submit(a.id, a.version, a.example, 'conflict-key');
  assert.throws(() => store.submit(a.id, a.version, { ...a.example, name: 'Different' }, 'conflict-key'), /IDEMPOTENCY_CONFLICT/);
  assert.throws(() => store.submit(a.id, '2.0.0', a.example, 'conflict-key'), /IDEMPOTENCY_CONFLICT/);
  const reordered = { source: a.example.source, email: a.example.email, name: a.example.name };
  assert.doesNotThrow(() => store.submit(a.id, a.version, reordered, 'conflict-key'));
  store.close();
});
test('durable deduplication survives reopening the database', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lab-store-')); const file = join(dir, 'test.sqlite');
  let store = new Store(file); const first = store.submit(a.id, a.version, a.example, 'durable-key'); store.close();
  store = new Store(file); assert.equal(store.submit(a.id, a.version, a.example, 'durable-key').id, first.id); store.close();
  rmSync(dir, { recursive: true });
});
test('SQL claim permits one owner across independent worker threads and connections', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'lab-claim-')); const file = join(dir, 'test.sqlite');
  const store = new Store(file); const run = store.submit(a.id, a.version, a.example, 'claim-key');
  try {
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./helpers/claim.mjs', import.meta.url), { workerData: { file, id: run.id, owner: 'worker-' + i } });
      worker.once('message', resolve); worker.once('error', reject); worker.once('exit', code => { if (code !== 0) reject(new Error('worker failed')); });
    })));
    assert.equal(results.filter(Boolean).length, 1);
  } finally { store.close(); rmSync(dir, { recursive: true }); }
});
test('restart marks an interrupted run for review rather than replaying it', () => {
  const store = new Store(); const run = store.submit(a.id, a.version, a.example, 'interrupted-key');
  store.claim(run.id, 'lost-owner'); store.recoverInterrupted();
  assert.equal(store.get(run.id).error, 'INTERRUPTED_REVIEW_REQUIRED');
  assert.equal(store.claim(run.id, 'new-owner'), undefined); store.close();
});
test('a stale owner cannot complete another owner\'s run', () => {
  const store = new Store(); const run = store.submit(a.id, a.version, a.example, 'owner-key');
  store.claim(run.id, 'owner'); store.finish(run.id, 'impostor', { wrong: true });
  assert.equal(store.get(run.id).status, 'running'); store.close();
});
test('pending jobs resume after startup', async () => {
  const store = new Store(); const run = store.submit(a.id, a.version, a.example, 'pending-key');
  const service = createService(store); await service.resumePending();
  assert.equal(store.get(run.id).status, 'succeeded'); store.close();
});
test('transient adapter failure retries with a bounded budget; raw errors are redacted', async () => {
  const store = new Store(); let attempts = 0;
  const service = createService(store, { retryDelay: async () => {}, execute: (a, input) => {
    if (++attempts < 3) throw new LabError('TRANSIENT_DEMO_FAILURE'); return a.execute(input);
  } });
  const run = await service.call('run_automation', request('retry-success')); await service.drain();
  assert.equal(attempts, 3); assert.equal(store.get(run.id).status, 'succeeded');
  let failures = 0;
  const failing = createService(store, { retryDelay: async () => {}, execute: () => { failures++; throw new LabError('TRANSIENT_DEMO_FAILURE'); } });
  const failed = await failing.call('run_automation', request('retry-exhausted')); await failing.drain();
  assert.equal(failures, 3); assert.equal(store.get(failed.id).status, 'failed');
  const unsafe = createService(store, { execute: () => { throw new Error('private provider response'); } });
  const hidden = await unsafe.call('run_automation', request('hidden-error')); await unsafe.drain();
  assert.equal(store.get(hidden.id).error, 'EXECUTION_FAILED'); store.close();
});
test('validation rejects unknown properties, malformed data and excessive retry budgets', async () => {
  const store = new Store(); const service = createService(store);
  await assert.rejects(service.call('run_automation', { ...request(), role: 'maintainer' }), /INVALID_ARGUMENTS/);
  await assert.rejects(service.call('run_automation', { ...request(), input: { ...a.example, email: 'invalid' } }), /INVALID_INPUT/);
  await assert.rejects(service.call('run_automation', { ...request(), input: { ...a.example, name: '   ' } }), /INVALID_INPUT/);
  assert.throws(() => incidentTriage({ status: 503, attempt: 1, maxAttempts: 100 }), /INVALID_INPUT/); store.close();
});
test('runner cannot invoke maintenance tools or promote itself', async () => {
  const store = new Store(); const service = createService(store);
  assert.equal(service.list('runner').length, 4); assert.equal(service.list('maintainer').length, 6);
  await assert.rejects(service.call('plan_deployment', { automationId: a.id }), /FORBIDDEN/);
  const plan = await service.call('plan_deployment', { automationId: a.id }, 'maintainer');
  assert.equal(plan.activated, false); store.close();
});
test('report handles zero baselines and impossible counts explicitly', () => {
  const result = monthlyReport({ current: { visits: 100, leads: 10 }, previous: { visits: 0, leads: 0 } });
  assert.equal(result.visitsChangePercent, null); assert.equal(result.conversionPercent, 10);
  assert.throws(() => monthlyReport({ current: { visits: 1, leads: 2 }, previous: { visits: 0, leads: 0 } }), /LEADS_EXCEED_VISITS/);
});
test('triage distinguishes rate limits, authentication failure and exhausted retry budget', () => {
  assert.equal(incidentTriage({ status: 429, attempt: 1, maxAttempts: 3 }).action, 'retry');
  assert.equal(incidentTriage({ status: 401, attempt: 1, maxAttempts: 3 }).action, 'review');
  assert.equal(incidentTriage({ status: 503, attempt: 3, maxAttempts: 3 }).reason, 'retry_budget_exhausted');
});
