import { Store } from '../src/store.mjs';
import { createService } from '../src/tools.mjs';
import { automations } from '../src/automations.mjs';
const store = new Store();
const service = createService(store);
try {
  for (const a of automations) {
    const args = { automationId: a.id, input: a.example, idempotencyKey: 'demo:' + a.id };
    const [first, duplicate] = await Promise.all([service.call('run_automation', args), service.call('run_automation', args)]);
    await service.drain();
    const result = await service.call('get_run', { runId: first.id });
    console.log(JSON.stringify({ automation: a.id, sameRunOnDuplicate: first.id === duplicate.id, status: result.status, output: result.output }, null, 2));
    if (result.status !== 'succeeded' || first.id !== duplicate.id) process.exitCode = 1;
  }
} finally { await service.drain(); store.close(); }
