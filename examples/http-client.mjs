import { createClient } from '../src/client.mjs';
const client = createClient();
const { automations } = await client.call('list_automations', {});
const example = automations.find(a => a.id === 'monthly-report');
let run = await client.call('run_automation', { automationId: example.id, input: example.example, idempotencyKey: 'http-monthly-report-example' });
for (let i = 0; i < 20 && ['pending', 'running'].includes(run.status); i++) {
  await new Promise(r => setTimeout(r, 500));
  run = await client.call('get_run', { runId: run.id });
}
console.log(JSON.stringify(run, null, 2));
if (run.status !== 'succeeded') process.exitCode = 1;
