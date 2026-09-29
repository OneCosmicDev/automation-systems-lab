import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { automations, describe } from '../src/automations.mjs';
import { root, workflowFor } from '../src/validation.mjs';
mkdirSync(join(root, 'workflows'), { recursive: true });
mkdirSync(join(root, 'examples'), { recursive: true });
for (const a of automations) writeFileSync(join(root, 'workflows', a.id + '.json'), JSON.stringify(workflowFor(a), null, 2) + '\n');
writeFileSync(join(root, 'examples', 'catalog.json'), JSON.stringify(automations.map(describe), null, 2) + '\n');
console.log('Generated three n8n workflows and the catalog.');
