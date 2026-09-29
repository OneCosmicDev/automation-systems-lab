import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const token = () => randomBytes(32).toString('hex');
try {
  writeFileSync('.env', 'LAB_PORT=4317\nLAB_URL=http://127.0.0.1:4317\nLAB_RUNNER_TOKEN=' + token() + '\nLAB_MAINTAINER_TOKEN=' + token() + '\nN8N_API_URL=http://127.0.0.1:5678\nN8N_API_KEY=\n', { flag: 'wx', mode: 0o600 });
  console.log('Created local .env with two random tokens. Values were not printed. Start with npm start.');
} catch (error) { if (error.code === 'EEXIST') console.log('.env already exists; preserved unchanged.'); else throw error; }
