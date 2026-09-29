# Local operations

## Gateway

From the repository root:

```sh
npm ci --ignore-scripts
npm run setup
npm start
```

The gateway binds to loopback only. Keep `.env` private and keep local state in `.data/`. Setup uses an exclusive file creation and never overwrites credentials. On Windows, file mode bits do not replace operating-system ACLs: keep the checkout under your own user account.

Use Ctrl+C for a graceful stop. To rotate tokens, stop the service, replace both token values with independently generated random values, restart it and reconnect clients. There is no token refresh or identity provider in this reference.

## Recover after a crash

1. Confirm no gateway process is still using this checkout and database.
2. Back up `.data/` while the process is stopped, including any SQLite WAL files.
3. Remove only the stale `.data/gateway.lock` file after confirming the owner is gone.
4. Restart. Pending runs resume; running runs are marked `INTERRUPTED_REVIEW_REQUIRED`.
5. Inspect failed runs. The demo has no external effects, so a reviewed new request with a new key can be safe. A future real adapter would first need reconciliation with the destination.

Do not share a SQLite file over a network filesystem or start another gateway from a different directory pointing to the same state. No multi-host mode is implemented.

## n8n manual demo

With Docker Engine running, `docker compose up -d` starts an isolated local n8n instance on `http://127.0.0.1:5678`. Complete its owner-account setup, import one of the three files in `workflows/`, and click Execute Workflow. The example requires no external credentials and has no schedule or webhook.

`docker compose down` stops the instance while preserving its named data volume. Keep that volume if you need the instance's users and workflows. No production instance is used.

## n8n API import

The default command only prints a plan:

```sh
npm run deploy -- lead-intake
```

To import, create an API key in **your local instance**, add it to the ignored `.env` as `N8N_API_KEY`, then run:

```sh
npm run deploy -- lead-intake --apply
```

The deployer accepts only a loopback n8n URL and creates an inactive workflow. It does not update, activate or delete workflows. It writes a local import receipt under `.data/` and refuses another import when that receipt exists. If a network error occurs after n8n accepted a create, inspect the instance before retrying: there is no server-side idempotency guarantee for this administrative API call.

To discard an example, identify it by the receipt and delete it manually in the local instance. There is no automated production rollback. A future production deployer must include revision checks, backups, approvals and tested rollback semantics.

## Verification commands

| Command | What it proves |
|---|---|
| `npm run check` | Source/artifact checks and behavioral tests |
| `npm run demo` | All three demonstrations complete without external access |
| `npm run test:n8n` | Actual import and execution in pinned n8n containers |
| `npm run generate` | Regenerate artifacts from the common source |
| `npm audit --omit=dev` | Dependency advisories known to the npm registry at execution time |

The integration test fails explicitly when Docker is unavailable; it never reports a skipped integration as successful.
