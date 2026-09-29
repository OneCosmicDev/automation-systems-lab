export class LabError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export function safeError(error) {
  return { error: { code: error instanceof LabError ? error.code : 'INTERNAL_ERROR' } };
}
