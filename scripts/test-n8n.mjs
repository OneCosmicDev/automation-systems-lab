import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { automations } from '../src/automations.mjs';
import { root, workflowFor } from '../src/validation.mjs';

const image = 'n8nio/n8n:2.40.7';
const dir = join(root, '.data', 'n8n-fixtures'); mkdirSync(dir, { recursive: true });
const available = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8' });
if (available.status !== 0) { console.error('Docker Engine is required for the real n8n integration suite. No integration test ran.'); process.exit(1); }
for (const a of automations) {
  const id = 'lab' + a.id.replaceAll('-', '');
  writeFileSync(join(dir, a.id + '.json'), JSON.stringify({ ...workflowFor(a), id }));
  const command = 'n8n import:workflow --input=/fixtures/' + a.id + '.json >/tmp/import.log 2>&1 || { cat /tmp/import.log; exit 1; }; n8n execute --id=' + id + ' --rawOutput';
  const result = spawnSync('docker', ['run', '--rm', '--network=none', '--mount', 'type=bind,source=' + dir + ',target=/fixtures,readonly',
    '-e', 'N8N_DIAGNOSTICS_ENABLED=false', '-e', 'N8N_VERSION_NOTIFICATIONS_ENABLED=false', '-e', 'N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true',
    '--entrypoint', 'sh', image, '-c', command], { encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) { console.error(result.stdout, result.stderr); throw new Error('n8n integration failed: ' + a.id); }
  const start = result.stdout.indexOf('{\n'); const end = result.stdout.lastIndexOf('}');
  let execution;
  try { execution = JSON.parse(result.stdout.slice(start, end + 1)); }
  catch { console.error(result.stdout); throw new Error('Could not parse n8n execution output.'); }
  const output = execution.data?.resultData?.runData?.['Validate and evaluate']?.[0]?.data?.main?.[0]?.[0]?.json;
  assert.deepEqual(output, { ok: true, result: a.execute(a.example) });
  console.log('PASS n8n ' + image + ': ' + a.id);
}
