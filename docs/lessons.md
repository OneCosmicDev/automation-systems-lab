# Verified engineering lessons

Keep lessons small, specific and connected to evidence. Never include customer names, infrastructure identifiers, credentials or raw provider payloads.

| Lesson | Evidence | Applicable boundary |
|---|---|---|
| A retry key must bind to a payload and version | Conflict and persistence tests | Gateway run acceptance |
| Read-after-write is not an atomic claim | SQL uses one conditional update; concurrent connection test | Local job ownership |
| Two agents need shared state for shared deduplication | Multi-client MCP/HTTP integration test | One trusted workspace |
| An interrupted effect must not be replayed blindly | Startup recovery test | Future external adapters |
| A written rule is not an enforcement mechanism | Server rejects maintenance calls from runner tokens | Tool authorization |
| Generated artifacts need drift checks | Workspace validation and n8n parity tests | Shared business functions |
| Zero-baseline percentages need explicit semantics | Report tests return null | Monthly-report 1.0.0 |

When adding a lesson, record the triggering regression test or repeatable experiment. If it is only a hypothesis, add it to the roadmap instead. Review version-specific lessons when upgrading the relevant dependency.
