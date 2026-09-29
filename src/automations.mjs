// Pure functions shared by the local runtime and generated n8n Code nodes.
// Keep them self-contained: n8n executes their source without module imports.
export function leadIntake(input) {
  if (!input || Object.keys(input).sort().join(',') !== 'email,name,source') throw new Error('INVALID_INPUT');
  if (typeof input.name !== 'string' || input.name.trim().length < 1 || input.name.length > 120) throw new Error('INVALID_INPUT');
  if (typeof input.email !== 'string' || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) throw new Error('INVALID_INPUT');
  if (!['website', 'referral', 'event'].includes(input.source)) throw new Error('INVALID_INPUT');
  return { name: input.name.trim(), email: input.email.trim().toLowerCase(), source: input.source,
    route: input.source === 'referral' ? 'relationship-team' : 'inbound-team', nextAction: 'review', delivery: 'simulated' };
}

export function monthlyReport(input) {
  if (!input || Object.keys(input).sort().join(',') !== 'current,previous') throw new Error('INVALID_INPUT');
  for (const period of [input.current, input.previous]) {
    if (!period || Object.keys(period).sort().join(',') !== 'leads,visits') throw new Error('INVALID_INPUT');
    if (![period.visits, period.leads].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000000)) throw new Error('INVALID_INPUT');
    if (period.leads > period.visits) throw new Error('LEADS_EXCEED_VISITS');
  }
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
  return { visits: input.current.visits, leads: input.current.leads,
    conversionPercent: input.current.visits === 0 ? null : round(input.current.leads / input.current.visits * 100),
    visitsChangePercent: input.previous.visits === 0 ? null : round((input.current.visits - input.previous.visits) / input.previous.visits * 100),
    leadsChangePercent: input.previous.leads === 0 ? null : round((input.current.leads - input.previous.leads) / input.previous.leads * 100),
    explanation: 'Percent changes with a zero baseline are undefined and returned as null.', delivery: 'simulated' };
}

export function incidentTriage(input) {
  if (!input || Object.keys(input).sort().join(',') !== 'attempt,maxAttempts,status') throw new Error('INVALID_INPUT');
  if (!Number.isInteger(input.status) || input.status < 0 || input.status > 599 || (input.status > 0 && input.status < 100)) throw new Error('INVALID_INPUT');
  if (!Number.isInteger(input.attempt) || !Number.isInteger(input.maxAttempts) || input.attempt < 1 || input.maxAttempts > 5 || input.attempt > input.maxAttempts) throw new Error('INVALID_INPUT');
  const transient = input.status === 0 || input.status === 429 || input.status >= 500;
  const retry = transient && input.attempt < input.maxAttempts;
  return { action: retry ? 'retry' : input.status >= 200 && input.status < 300 ? 'complete' : 'review',
    delaySeconds: retry ? Math.min(60, 2 ** input.attempt) : 0,
    reason: retry ? 'transient_failure' : transient ? 'retry_budget_exhausted' : 'terminal_response', delivery: 'simulated' };
}

const strict = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const count = { type: 'integer', minimum: 0, maximum: 1000000000 };
const period = strict({ visits: count, leads: count });
export const automations = [
  { id: 'lead-intake', version: '1.0.0', title: 'Normalize and route a lead',
    description: 'Turn an inconsistent inbound contact into a review-ready record. No CRM write or email.',
    inputSchema: strict({ name: { type: 'string', minLength: 1, maxLength: 120 }, email: { type: 'string', minLength: 3, maxLength: 254 }, source: { enum: ['website', 'referral', 'event'] } }),
    example: { name: ' Alex Example ', email: ' ALEX@example.com ', source: 'referral' }, execute: leadIntake },
  { id: 'monthly-report', version: '1.0.0', title: 'Compute an auditable monthly report',
    description: 'Calculate conversion and month-over-month changes, explicitly handling a zero baseline. No invented narrative or analytics connection.',
    inputSchema: strict({ current: period, previous: period }),
    example: { current: { visits: 1200, leads: 60 }, previous: { visits: 1000, leads: 40 } }, execute: monthlyReport },
  { id: 'incident-triage', version: '1.0.0', title: 'Classify a failed integration call',
    description: 'Distinguish successful, transient and terminal responses with a bounded retry recommendation. No notification is sent.',
    inputSchema: strict({ status: { type: 'integer', minimum: 0, maximum: 599 }, attempt: { type: 'integer', minimum: 1, maximum: 5 }, maxAttempts: { type: 'integer', minimum: 1, maximum: 5 } }),
    example: { status: 503, attempt: 1, maxAttempts: 3 }, execute: incidentTriage }
];
export function describe(a) { const { execute, ...publicFields } = a; return publicFields; }
