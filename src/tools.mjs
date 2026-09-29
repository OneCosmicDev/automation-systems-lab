import Ajv from 'ajv';
import { randomUUID } from 'node:crypto';
import { automations, describe } from './automations.mjs';
import { LabError } from './errors.mjs';
import { validateWorkspace, deploymentPlan } from './validation.mjs';

const ajv = new Ajv({ strict: true });
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const automationId = { enum: automations.map(a => a.id) };
export const tools = [
  { name: 'list_automations', description: 'Discover the three synthetic demonstrations.', inputSchema: object({}), role: 'runner', readOnly: true },
  { name: 'describe_automation', description: 'Get a versioned input schema and synthetic example.', inputSchema: object({ automationId }), role: 'runner', readOnly: true },
  { name: 'run_automation', description: 'Submit a synthetic demonstration. Reusing a key with the same payload returns the same run; changed payloads conflict. No external side effects.',
    inputSchema: object({ automationId, input: { type: 'object' }, idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[a-zA-Z0-9._:-]+$' } }), role: 'runner', readOnly: false },
  { name: 'get_run', description: 'Read the state and result of an accepted demonstration.', inputSchema: object({ runId: { type: 'string', pattern: '^[a-f0-9-]{36}$' } }), role: 'runner', readOnly: true },
  { name: 'validate_workspace', description: 'Check the local reference workflows and publication hygiene. Does not validate arbitrary submitted code.', inputSchema: object({}), role: 'maintainer', readOnly: true },
  { name: 'plan_deployment', description: 'Preview importing an allowlisted example into a local n8n instance. This tool never deploys or activates.', inputSchema: object({ automationId }), role: 'maintainer', readOnly: true }
];
const toolValidators = new Map(tools.map(t => [t.name, ajv.compile(t.inputSchema)]));
const inputValidators = new Map(automations.map(a => [a.id, ajv.compile(a.inputSchema)]));

export function createService(store, { execute = (a, input) => a.execute(input), retryDelay = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  const owner = randomUUID();
  const running = new Map();
  async function processRun(id) {
    if (running.has(id)) return running.get(id);
    const row = store.claim(id, owner);
    if (!row) return;
    const promise = (async () => {
      try {
        const a = automations.find(x => x.id === row.automation && x.version === row.version);
        if (!a) throw new LabError('AUTOMATION_VERSION_UNAVAILABLE');
        let output;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try { output = await execute(a, JSON.parse(row.input)); break; }
          catch (error) {
            if (error.code !== 'TRANSIENT_DEMO_FAILURE' || attempt === 3) throw error;
            await retryDelay(25 * 2 ** (attempt - 1));
          }
        }
        store.finish(id, owner, output);
      } catch (error) {
        store.finish(id, owner, null, error instanceof LabError ? error.code : 'EXECUTION_FAILED');
      }
    })();
    running.set(id, promise);
    promise.finally(() => running.delete(id));
    return promise;
  }
  return {
    list(role) { return tools.filter(t => t.role === 'runner' || role === 'maintainer'); },
    async call(name, args, role = 'runner') {
      const tool = tools.find(t => t.name === name);
      if (!tool) throw new LabError('TOOL_NOT_FOUND', 404);
      if (tool.role === 'maintainer' && role !== 'maintainer') throw new LabError('FORBIDDEN', 403);
      if (!toolValidators.get(name)(args)) throw new LabError('INVALID_ARGUMENTS', 400);
      const a = automations.find(x => x.id === args.automationId);
      switch (name) {
        case 'list_automations': return { automations: automations.map(describe) };
        case 'describe_automation': return describe(a);
        case 'get_run': return store.get(args.runId);
        case 'validate_workspace': return validateWorkspace();
        case 'plan_deployment': return deploymentPlan(args.automationId);
        case 'run_automation': {
          if (!inputValidators.get(a.id)(args.input)) throw new LabError('INVALID_INPUT', 400);
          // Pure domain validation also runs before any durable job is accepted.
          try { a.execute(args.input); } catch { throw new LabError('INVALID_INPUT', 400); }
          const run = store.submit(a.id, a.version, args.input, args.idempotencyKey);
          setImmediate(() => { processRun(run.id).catch(() => {}); });
          return run;
        }
      }
    },
    async resumePending() { await Promise.all(store.pending().map(processRun)); },
    async drain() { await new Promise(r => setImmediate(r)); await Promise.all(running.values()); }
  };
}
