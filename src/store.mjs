import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import { LabError } from './errors.mjs';

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export class Store {
  constructor(filename = ':memory:') {
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY, request_key TEXT NOT NULL UNIQUE, fingerprint TEXT NOT NULL,
        automation TEXT NOT NULL, version TEXT NOT NULL, input TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending','running','succeeded','failed')),
        owner TEXT, output TEXT, error TEXT, created TEXT NOT NULL, updated TEXT NOT NULL
      );`);
  }
  submit(automation, version, input, key) {
    const fingerprint = createHash('sha256').update(canonical({ automation, version, input })).digest('hex');
    const now = new Date().toISOString();
    this.db.prepare('INSERT INTO runs (id,request_key,fingerprint,automation,version,input,status,created,updated) VALUES (?,?,?,?,?,?,\'pending\',?,?) ON CONFLICT(request_key) DO NOTHING')
      .run(randomUUID(), key, fingerprint, automation, version, JSON.stringify(input), now, now);
    const row = this.db.prepare('SELECT * FROM runs WHERE request_key=?').get(key);
    if (row.fingerprint !== fingerprint) throw new LabError('IDEMPOTENCY_CONFLICT', 409);
    return this.get(row.id);
  }
  claim(id, owner) {
    return this.db.prepare("UPDATE runs SET status='running',owner=?,updated=? WHERE id=? AND status='pending' RETURNING *")
      .get(owner, new Date().toISOString(), id);
  }
  finish(id, owner, output, error = null) {
    this.db.prepare("UPDATE runs SET status=?,output=?,error=?,updated=? WHERE id=? AND owner=? AND status='running'")
      .run(error ? 'failed' : 'succeeded', output ? JSON.stringify(output) : null, error, new Date().toISOString(), id, owner);
  }
  get(id) {
    const row = this.db.prepare('SELECT * FROM runs WHERE id=?').get(id);
    if (!row) throw new LabError('RUN_NOT_FOUND', 404);
    return { id: row.id, automation: row.automation, version: row.version, status: row.status,
      output: row.output ? JSON.parse(row.output) : null, error: row.error, createdAt: row.created, updatedAt: row.updated };
  }
  pending() { return this.db.prepare("SELECT id FROM runs WHERE status='pending'").all().map(r => r.id); }
  recoverInterrupted() {
    // Only called by the single gateway owner on startup. Never silently replay unknown effects.
    this.db.prepare("UPDATE runs SET status='failed',error='INTERRUPTED_REVIEW_REQUIRED',updated=? WHERE status='running'").run(new Date().toISOString());
  }
  close() { this.db.close(); }
}
