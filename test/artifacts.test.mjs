import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { automations } from '../src/automations.mjs';
import { root, validateWorkspace, scanText } from '../src/validation.mjs';
test('generated n8n Code nodes execute the same rules as the runtime', () => {
  for (const a of automations) {
    const workflow = JSON.parse(readFileSync(join(root, 'workflows', a.id + '.json'), 'utf8'));
    const fixture = vm.runInNewContext('(function(){' + workflow.nodes[1].parameters.jsCode + '})()', {}, { timeout: 500 });
    const result = vm.runInNewContext('(function(){' + workflow.nodes[2].parameters.jsCode + '})()', { $input: { first: () => fixture[0] } }, { timeout: 500 });
    assert.deepEqual(JSON.parse(JSON.stringify(result[0].json)), { ok: true, result: a.execute(a.example) });
    const invalid = vm.runInNewContext('(function(){' + workflow.nodes[2].parameters.jsCode + '})()', { $input: { first: () => ({ json: {} }) } }, { timeout: 500 });
    assert.equal(invalid[0].json.ok, false);
  }
});
test('workspace is consistent and unknown placeholders fail publication checks', () => {
  assert.equal(validateWorkspace().ok, true);
  assert.equal(scanText('PLACEHOLDER_' + 'UNREGISTERED_VALUE', 'workflows/example.json')[0].rule, 'unbound-placeholder');
});
