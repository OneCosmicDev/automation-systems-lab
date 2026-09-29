# Automation Systems Lab

An agent-neutral reference architecture for discoverable, validated and traceable automation. The project demonstrates the operational foundation around workflows: contracts, permissions, durable request deduplication, atomic work ownership, recovery rules and repeatable verification.

## Run it

```sh
npm ci --ignore-scripts
npm run demo
npm run check
```

Node 22.19+ or Node 24 LTS is required. The demo uses fictional data and needs no API key, AI model or external account.

## Three examples

- **Lead intake:** validate, normalize and route a fictional contact.
- **Monthly report:** compute conversion and period changes with explicit zero-baseline handling.
- **Incident triage:** distinguish transient failures from terminal responses and enforce a retry budget.

All outputs are simulated. Nothing is sent to a CRM, mailbox or messaging channel.

## Agent access

For guided setup, ask a coding agent with access to your local terminal and files to follow [the bootstrap prompt](agent-bootstrap.md). It separates the lab gateway from the additional n8n management connector and requires a real import/execution test before declaring readiness. Account setup, private credential entry or a client restart may need your participation. This adaptive procedure is not certified for every agent application.

`npm run setup` creates local tokens without printing them. `npm start` runs an authenticated loopback gateway. MCP stdio clients connect through a thin bridge; ordinary HTTP clients call the same versioned tools. Two independent MCP clients and an HTTP client are tested against shared run state.

Runner tools discover, execute and inspect examples. Maintainer tools validate the workspace and preview an inactive local n8n import. Permissions are enforced by code, not model instructions.

## n8n and scalability

The repository also contains three importable n8n graphs generated from the same business functions. These run independently of the gateway. CI imports and executes them in pinned n8n containers. The gateway does not currently trigger a remote n8n instance.

The reference targets one trusted workspace on one host. SQLite provides persistent deduplication and atomic claims. Multi-host workers, per-identity authorization, tenant isolation and external side-effect guarantees are future work. No load benchmark is claimed.

Start with [architecture](architecture.md), [agent integration](agents.md), [verification](verification.md), and [decisions](decisions.md). The [roadmap](../ROADMAP.md) separates implemented capabilities from planned extensions.
