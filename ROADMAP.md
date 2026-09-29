# Roadmap

## Implemented in the initial reference

- [x] Three synthetic business examples and a generated catalog.
- [x] Shared HTTP/MCP contract and server-enforced roles.
- [x] Persistent request deduplication and atomic local work claims.
- [x] Explicit interruption handling and bounded synthetic retry tests.
- [x] Generated n8n exports with code-parity checks and a real-runtime CI job.
- [x] Local-only inactive import planning and an explicit CLI apply command.
- [x] Automated artifact consistency and Git-history secret scanning.
- [x] French/English explanations, architecture decisions and limitations.
- [x] Agent-assisted bootstrap prompt with prerequisites, private credential handling, capability checks and explicit readiness criteria; client-specific end-to-end certification remains future work.

## Next: connect a real execution backend

- [ ] Add a versioned remote n8n execution adapter and validate end-to-end authorization.
- [ ] Select one real integration and define its destination idempotency/reconciliation contract.
- [ ] Add an outbox and recovery tests around the external side effect.
- [ ] Add correlation IDs and latency/error metrics across the integration boundary.
- [ ] Add deployment revision checks, staging and tested rollback.

## Then: multiple identities and hosts

- [ ] Replace shared role tokens with per-identity authentication and revocation.
- [ ] Bind run visibility and permissions to authenticated tenants.
- [ ] Migrate state to PostgreSQL and introduce durable queue ownership with fencing.
- [ ] Measure throughput, tail latency, queue age and provider quotas before scaling workers.
- [ ] Evaluate n8n queue mode independently from the application-level deduplication ledger.

## Portfolio improvements

- [ ] Record a short walkthrough using the synthetic fixtures.
- [ ] Document app-specific MCP configurations only after testing them.
- [ ] Choose an explicit reuse license if the owner wants open-source distribution.

Checkboxes describe implementation, not a guarantee of security or production readiness. Current test results live in GitHub Actions.
