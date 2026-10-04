# Security policy

## Public deployment

The GitHub Pages build is frontend-only. It does not contain `.env`, database
exports, `scanner.config.json`, server API keys, or service-role credentials.
Browser settings and scan history remain in the visitor's own local storage.

## Secret handling

- Keep local credentials in `Websz/.env` or `Websz/scanner.config.json`.
- Never put secrets in `VITE_*` variables; Vite embeds those values in public
  browser JavaScript.
- Use repository or environment secrets only for server-side workflows.
- Run `npm run security:check` from `Websz` before publishing.
- Revoke and rotate a credential immediately if it is ever committed.

The Pages workflow runs the same secret check and refuses to deploy when a
known credential pattern or private configuration file is tracked.
