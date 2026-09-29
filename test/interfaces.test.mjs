import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Store } from '../src/store.mjs';
import { createService } from '../src/tools.mjs';
import { createHttpServer } from '../src/http.mjs';
import { createClient } from '../src/client.mjs';
import { automations } from '../src/automations.mjs';
async function fixture(maxRequests = 1000) {
  const store = new Store(); const service = createService(store);
  const runnerToken = randomBytes(32).toString('hex'), maintainerToken = randomBytes(32).toString('hex');
  const server = createHttpServer(service, { runnerToken, maintainerToken, maxRequests });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = 'http://127.0.0.1:' + server.address().port;
  return { service, url, runnerToken, maintainerToken, client: createClient({ url, token: runnerToken }),
    async close() { await service.drain(); await new Promise(r => server.close(r)); store.close(); } };
}
test('HTTP authenticates, rejects browser origins and enforces maintenance permissions', async () => {
  const f = await fixture();
  try {
    assert.equal((await fetch(f.url + '/v1/tools')).status, 401);
    assert.equal((await fetch(f.url + '/v1/tools', { headers: { Authorization: 'Bearer ' + f.runnerToken, Origin: 'https://example.com' } })).status, 403);
    assert.equal((await f.client.list()).tools.length, 4);
    await assert.rejects(f.client.call('validate_workspace', {}), /FORBIDDEN/);
    assert.equal((await createClient({ url: f.url, token: f.maintainerToken }).call('validate_workspace', {})).ok, true);
    const large = await fetch(f.url + '/v1/tools/run_automation', { method: 'POST', headers: { Authorization: 'Bearer ' + f.runnerToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(66000) }) });
    assert.equal(large.status, 413);
  } finally { await f.close(); }
});
test('rate limiting is bounded per authenticated role', async () => {
  const f = await fixture(2);
  try { await f.client.list(); await f.client.list(); await assert.rejects(f.client.list(), /RATE_LIMITED/); }
  finally { await f.close(); }
});
test('two independent MCP clients and HTTP share one idempotent run and contract', async () => {
  const f = await fixture(); const clients = [];
  try {
    for (let i = 0; i < 2; i++) {
      const client = new Client({ name: 'conformance-client-' + i, version: '1.0.0' });
      await client.connect(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../src/mcp.mjs', import.meta.url))],
        env: { ...process.env, LAB_URL: f.url, LAB_TOKEN: f.runnerToken }, stderr: 'pipe' }));
      clients.push(client);
    }
    assert.equal((await clients[0].listTools()).tools.length, 4);
    const a = automations[0]; const args = { automationId: a.id, input: a.example, idempotencyKey: 'interfaces-same-key' };
    const [one, two, httpRun] = await Promise.all([
      clients[0].callTool({ name: 'run_automation', arguments: args }),
      clients[1].callTool({ name: 'run_automation', arguments: args }), f.client.call('run_automation', args)
    ]);
    assert.equal(one.structuredContent.id, two.structuredContent.id); assert.equal(one.structuredContent.id, httpRun.id);
    await f.service.drain();
    const result = await clients[0].callTool({ name: 'get_run', arguments: { runId: httpRun.id } });
    assert.equal(result.structuredContent.status, 'succeeded'); assert.deepEqual(result.structuredContent.output, a.execute(a.example));
    const denied = await clients[0].callTool({ name: 'plan_deployment', arguments: { automationId: a.id } });
    assert.equal(denied.isError, true);
  } finally { await Promise.all(clients.map(c => c.close())); await f.close(); }
});
