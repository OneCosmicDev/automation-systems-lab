import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { deploymentPlan, root, workflowFor } from '../src/validation.mjs';
import { automations } from '../src/automations.mjs';

const args = process.argv.slice(2);
const id = args.find(a => !a.startsWith('--'));
if (!id || args.some(a => a.startsWith('--') && a !== '--apply')) {
  console.error('Usage: npm run deploy -- <automation-id> [--apply]'); process.exit(1);
}
try {
  const plan = deploymentPlan(id);
  if (!args.includes('--apply')) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    const url = new URL(process.env.N8N_API_URL || 'http://127.0.0.1:5678');
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Only a local n8n instance is accepted by this demo deployer.');
    const key = process.env.N8N_API_KEY;
    if (!key) throw new Error('N8N_API_KEY is required for --apply.');
    const stateDir = join(root, '.data'); mkdirSync(stateDir, { recursive: true });
    const bindingPath = join(stateDir, 'n8n-' + id + '.json');
    if (existsSync(bindingPath)) throw new Error('A local import receipt already exists. Inspect it and the instance before importing again. No overwrite was performed.');
    const source = workflowFor(automations.find(a => a.id === id));
    const { name, nodes, connections, settings } = source;
    const response = await fetch(url.origin + '/api/v1/workflows', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { 'X-N8N-API-KEY': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, nodes, connections, settings }) });
    if (!response.ok) throw new Error('n8n import failed (HTTP ' + response.status + '). Response omitted to avoid logging sensitive data.');
    const result = await response.json();
    if (typeof result.id !== 'string') throw new Error('n8n response has no workflow ID. Inspect the instance before retrying.');
    writeFileSync(bindingPath, JSON.stringify({ id: result.id, sha256: plan.sha256, importedAt: new Date().toISOString(), target: url.origin }, null, 2), { flag: 'wx', mode: 0o600 });
    console.log('Imported an inactive local workflow. Receipt saved under .data/. Activation was not requested.');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
