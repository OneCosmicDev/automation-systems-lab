import { LabError } from './errors.mjs';
export function createClient({ url = process.env.LAB_URL || 'http://127.0.0.1:4317', token = process.env.LAB_TOKEN || process.env.LAB_RUNNER_TOKEN } = {}) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' || parsed.hostname !== '127.0.0.1' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('This reference client only connects to a local loopback gateway.');
  if (!token) throw new Error('Set LAB_TOKEN or LAB_RUNNER_TOKEN.');
  async function request(path, options = {}) {
    let response;
    try { response = await fetch(parsed.origin + path, { ...options, redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } }); }
    catch { throw new LabError('GATEWAY_UNREACHABLE', 502); }
    let body;
    try { body = await response.json(); } catch { throw new LabError('INVALID_GATEWAY_RESPONSE', 502); }
    if (!response.ok) throw new LabError(body.error?.code || 'GATEWAY_ERROR', response.status);
    return body;
  }
  return { list: () => request('/v1/tools'), call: (name, args) => request('/v1/tools/' + name, { method: 'POST', body: JSON.stringify(args) }) };
}
