# Verification and limits of evidence

## Reproducible evidence

The primary evidence is the current [CI run](https://github.com/OneCosmicDev/automation-systems-lab/actions/workflows/ci.yml), not a static claim that every historical revision passed.

| Check | Method | Scope |
|---|---|---|
| Shared semantics | Execute generated Code-node JavaScript in a constrained VM and compare to pure functions | Code parity, not n8n runtime compatibility |
| n8n compatibility | Import and execute every workflow in a pinned n8n container | The three manual graphs on version 2.40.7 |
| Concurrent requests | Twenty submissions through one service | One run and one business invocation |
| SQL ownership | Six independent worker-thread connections | One successful atomic claim |
| Durable state | Close and reopen SQLite | Same key resolves to the same run |
| Crash recovery | Leave a run in running state, perform startup recovery | Interrupted effects are not silently replayed |
| Transport compatibility | Two independent official MCP SDK clients plus HTTP | Same contracts, permissions and shared execution state |
| Transient failure | Controlled synthetic adapter failures | Bounded retry and terminal failure behavior |
| Secret hygiene | Heuristic source checks plus Gitleaks over Git history | Known patterns, not proof that all confidential data is absent |

## What is not claimed

- No throughput, latency percentile, availability or cost benchmark.
- No proof of compatibility with every named AI application.
- No execution against a real CRM, email provider or analytics account.
- No exactly-once external side effects.
- No tenant isolation; this is one trusted workspace.
- No production infrastructure or incident response certification.
- No remote n8n execution via the gateway in this version.

Fixtures were written for the public reference. Results and percentages in the README are computed from these fixtures and are not client outcomes. Third-party libraries are dependencies, not claimed as original work.
