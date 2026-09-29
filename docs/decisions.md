# Architecture decisions

## ADR 001 — One tool contract, multiple transports

**Accepted.** HTTP performs authorization and validation. MCP is a stdio bridge to that same service. Both interfaces share run state. This avoids per-agent implementations and ensures that permissions remain enforced even when an agent ignores instructions.

Tradeoff: the gateway must be running before a bridge can discover tools. The bridge reports an unavailable gateway rather than silently switching to a different mode.

## ADR 002 — Fresh public implementation

**Accepted.** The public repository has an independent history, new fixtures and generic examples. Operational exports, customer materials, infrastructure configuration and historical credential values are excluded. It documents ideas and demonstrates behavior without publishing an operational environment.

## ADR 003 — Durable local state before distributed workers

**Accepted.** SQLite provides unique constraints and transactional row updates without requiring a database account for the demo. One gateway owns the process lifecycle. This makes concurrent-agent behavior demonstrable while keeping a clear migration boundary for PostgreSQL and a distributed queue.

Tradeoff: synchronous SQLite calls share the Node event loop; this is not a high-throughput service. Interrupted jobs require explicit review instead of automatic re-execution.

## ADR 004 — Shared source, independent execution paths

**Accepted.** Pure business functions generate the n8n Code nodes. Local API tests and real n8n integration tests exercise those functions through different execution paths. The gateway does not claim to be a replacement for n8n scheduling or orchestration.

Tradeoff: these examples do not demonstrate remote n8n invocation. That capability belongs in an explicit future adapter with its own authentication, recovery and error contract.

## ADR 005 — Maintenance previews are separate from deployment

**Accepted.** Agents may validate and plan with the maintainer role. Actual import is an explicit local CLI action, restricted to loopback and inactive graphs. No deployment keys are available to runner tools.

## ADR 006 — Public visibility is separate from licensing

**Accepted for this initial publication.** No broad redistribution or commercial-use license is added by default. A future license decision belongs to the repository owner and must account for any third-party material. This reference includes no copied vendor source tree.
