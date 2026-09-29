import { validateWorkspace } from '../src/validation.mjs';
const result = validateWorkspace();
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
