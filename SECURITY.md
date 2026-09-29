# Security boundaries

This is a local reference implementation using synthetic data. It is not a publicly hosted API or an authorization layer for mutually untrusted tenants.

- Do not expose the gateway to the internet or change its loopback binding without designing remote authentication, TLS, identity isolation and abuse controls.
- Do not put real contacts or customer records into demos intended for publication.
- `.env`, SQLite files, import receipts and local runtime state are excluded from Git.
- Public n8n artifacts contain no deployed workflow IDs, credential bindings or execution data.
- Keep production exports out of the repository even if their filenames look like examples.
- The source scanner and Gitleaks complement human review; they cannot prove that all confidential information is absent.
- If a secret is exposed, revoke/rotate it before treating Git cleanup as sufficient.
- Stop the gateway before backing up its database. Apply access controls to backups too.

If you discover a vulnerability, use GitHub's private vulnerability reporting for this repository when available. Do not post credentials, exploit payloads containing private data, or production configuration in a public issue.

Development dependencies and container images must be reviewed during updates. The n8n image is pinned to a version for reproducibility, not represented as permanently free of vulnerabilities.
