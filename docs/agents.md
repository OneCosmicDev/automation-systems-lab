# Connect an agent

## Start the shared gateway

Run `npm ci --ignore-scripts`, `npm run setup`, then `npm start` from the repository root. The setup command preserves an existing `.env` and never prints tokens. Keep the gateway running in its terminal.

All agent processes connect to this gateway. They must not each start a private runtime if they intend to share deduplication and run state.

## MCP stdio

Use [examples/mcp-client.json](../examples/mcp-client.json) as a conventional configuration example. Replace both absolute paths with your checkout paths. On Windows use forward slashes such as `C:/Projects/automation-systems-lab/.env`.

The command is `node`; arguments load the local environment file and start `src/mcp.mjs`. Node loads the environment before the bridge starts. The bridge defaults to the runner token. To use maintenance tools, set `LAB_TOKEN` to the maintainer token in the client process's secret environment. Do not commit a filled-in client configuration.

Some clients use a configuration format other than `mcpServers`. Configure the equivalent executable, arguments and environment in that client's supported settings. This project implements MCP stdio, not a remote MCP HTTP endpoint. The HTTP interface below is an ordinary JSON API.

Suggested first request to an agent:

> Discover the available automations. Inspect monthly-report, run its synthetic example with a new idempotency key, then poll get_run until it finishes. Explain the result and its limits.

## HTTP API

Authentication: `Authorization: Bearer <local token>`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/tools` | List tools allowed by this token |
| POST | `/v1/tools/{tool_name}` | Call an allowed tool with its JSON arguments |

Use the schemas returned by discovery instead of inventing fields. Both HTTP and MCP call the same server-side implementation. [examples/http-client.mjs](../examples/http-client.mjs) is runnable with `node --env-file=.env examples/http-client.mjs` while the server is running.

Example body for `POST /v1/tools/run_automation`:

```json
{
  "automationId": "monthly-report",
  "idempotencyKey": "report-demo-2026-01",
  "input": {
    "current": { "visits": 1200, "leads": 60 },
    "previous": { "visits": 1000, "leads": 40 }
  }
}
```

The response contains `id`, `automation`, `version`, `status`, `output`, `error`, `createdAt` and `updatedAt`. Submission typically returns `pending`; call `get_run` with `{ "runId": "returned UUID" }` until `succeeded` or `failed`. Poll slowly enough to stay within the rate budget.

Reusing the same key and payload returns the existing run. Changing the payload or automation version under the same key returns `IDEMPOTENCY_CONFLICT`. A failed run also retains its key; investigate before submitting a new key. The key applies across the shared workspace.

## Errors and compatibility

HTTP errors contain `{ "error": { "code": "..." } }`. Common statuses: 400 invalid arguments/input, 401 missing token, 403 insufficient permissions or rejected origin, 404 unknown tool/run, 409 idempotency conflict, 413 oversized input, 415 non-JSON body, 429 rate limit. MCP call errors use `isError: true` and the same code in text content.

Contract version: tools live under `/v1`; each automation has its own semantic version. Breaking input or output changes require a new contract/version and corresponding fixtures. Removal of an automation with pending runs needs a migration or explicit failure handling.

| Client path | Evidence |
|---|---|
| Node HTTP client | Integration tests |
| Two independent official MCP SDK clients | Discovery, calls, results, permissions, shared run tested |
| Other MCP stdio applications | Protocol-compatible in principle; individual app configuration not certified |
| Remote MCP / OAuth / multi-tenant hosting | Not implemented |
