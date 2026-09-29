import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { automations } from './automations.mjs';
import { LabError } from './errors.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export function workflowFor(a) {
  return {
    name: '[Lab] ' + a.title, active: false,
    nodes: [
      { id: 'manual-trigger', name: 'Run synthetic example', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
      { id: 'synthetic-input', name: 'Load fictional input', type: 'n8n-nodes-base.code', typeVersion: 2, position: [260, 0],
        notes: 'Synthetic fixture only. Replace with a validated source in your own environment.',
        parameters: { jsCode: 'return [{ json: ' + JSON.stringify(a.example, null, 2) + ' }];' } },
      { id: 'business-rule', name: 'Validate and evaluate', type: 'n8n-nodes-base.code', typeVersion: 2, position: [520, 0],
        notes: 'Generated from the shared pure business function. No network, credentials, or real delivery.',
        parameters: { jsCode: a.execute.toString() + '\ntry {\n  return [{ json: { ok: true, result: ' + a.execute.name + '($input.first().json) } }];\n} catch {\n  return [{ json: { ok: false, error: { code: "INVALID_INPUT" } } }];\n}' } }
    ],
    connections: {
      'Run synthetic example': { main: [[{ node: 'Load fictional input', type: 'main', index: 0 }]] },
      'Load fictional input': { main: [[{ node: 'Validate and evaluate', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1', executionTimeout: 60, timezone: 'UTC' }, pinData: {}
  };
}
export function scanText(text, file = '') {
  const findings = [];
  const rules = [
    ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['provider-token', /\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{25,}|sk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}|xox[baprs]-[A-Za-z0-9-]{20,})/],
    ['jwt', /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/],
    ['telegram-token', /\b[0-9]{8,12}:[A-Za-z0-9_-]{30,}\b/]
  ];
  for (const [rule, expression] of rules) if (expression.test(text)) findings.push({ file, rule });
  // Generated artifacts may never contain unbound sentinels, even unknown ones.
  if (file.startsWith('workflows/') && /PLACEHOLDER_[A-Z0-9_]+/.test(text)) findings.push({ file, rule: 'unbound-placeholder' });
  return findings;
}
export function sourceFiles(base = root) {
  const ignored = new Set(['.git', '.data', 'node_modules', 'coverage']);
  function walk(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      if (ignored.has(entry.name) || (entry.name.startsWith('.env') && entry.name !== '.env.example')) return [];
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) return [];
      return entry.isDirectory() ? walk(path) : [path];
    });
  }
  return walk(base);
}
export function validateWorkspace(base = root) {
  const findings = [];
  const tracked = spawnSync('git', ['ls-files', '-z'], { cwd: base, encoding: 'utf8' });
  if (tracked.status === 0) for (const file of tracked.stdout.split('\0').filter(Boolean)) {
    if ((/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith('.env.example')) || /^(?:\.data|node_modules)\//.test(file) || /\.(?:sqlite(?:-wal|-shm)?|db)$/.test(file)) findings.push({ file, rule: 'private-runtime-file-tracked' });
  }
  for (const a of automations) {
    const file = 'workflows/' + a.id + '.json';
    try {
      const actual = JSON.parse(readFileSync(join(base, file), 'utf8'));
      if (JSON.stringify(actual) !== JSON.stringify(workflowFor(a))) findings.push({ file, rule: 'generated-workflow-drift' });
      if (actual.active || actual.id || actual.staticData || Object.keys(actual.pinData || {}).length) findings.push({ file, rule: 'runtime-state-in-export' });
      for (const node of actual.nodes || []) if (node.credentials) findings.push({ file, rule: 'credential-binding-in-export' });
    } catch { findings.push({ file, rule: 'missing-or-invalid-workflow' }); }
  }
  for (const path of sourceFiles(base)) findings.push(...scanText(readFileSync(path, 'utf8'), relative(base, path).replaceAll('\\', '/')));
  return { ok: findings.length === 0, findings, scope: 'Generated artifact consistency and heuristic secret checks; not a complete security audit.' };
}
export function deploymentPlan(id) {
  const a = automations.find(x => x.id === id);
  if (!a) throw new LabError('AUTOMATION_NOT_FOUND', 404);
  const validation = validateWorkspace();
  if (!validation.ok) throw new LabError('VALIDATION_FAILED', 422);
  const body = workflowFor(a);
  return { automationId: id, operation: 'create_inactive_workflow', environment: 'local',
    sha256: createHash('sha256').update(JSON.stringify(body)).digest('hex'),
    nodes: body.nodes.length, credentialsRequired: 0, externalEffects: false, activated: false };
}
