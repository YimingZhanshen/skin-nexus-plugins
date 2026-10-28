# Plugin repository spec

This file defines what belongs in this repository. Runtime semantics are owned
by the host project: <https://github.com/YimingZhanshen/skin-nexus/blob/main/docs/plugin-spec.md>.
When the two disagree, the host spec wins.

## 1. Required layout

```
plugins/<name>/
  plugin.json      # hookApi=2 manifest, name must equal the directory
  index.js         # entrypoint (name from plugin.json)
  market.json      # market metadata, required for publishing
  README.md        # optional but recommended: usage, permissions, stored data
  ui/              # only when ui.assets is declared
```

Optional per-plugin `LICENSE` if it differs from the repository default.

Forbidden: `bundle.json`, private keys (`*.pem`/`*.key`), native binaries
(`.exe/.dll/.so/.dylib`), symlinks, `node_modules`, secrets, obfuscated code.

## 2. Naming and versions

- `name`: `^[a-z0-9][a-z0-9_-]{1,63}$`, unique across the repository.
- `version`: semver-like `MAJOR.MINOR.PATCH`; must be **strictly greater** than
  the version currently published in `v1/registry.json`.
- A published `(name, version)` is immutable. Any change requires a new version.
- New plugins start at `1.0.0`.

## 3. Manifest and market metadata

- `hookApi` must be `2`; declare the minimum host version in `minServer` and
  mirror it in `market.json` (the linter enforces equality when both exist).
- `market.json.capabilities` must equal `plugin.json.permissions` exactly.
- `requires` / `conflicts` must match between the two files.
- Every non-trivial permission needs a one-line justification in the plugin
  README or the pull-request description (why it is needed, what data it touches).

## 4. Code rules

- Zero build: plain JS running in the host's goja VM. No network, filesystem,
  timers, `require`, `eval`-based loading of remote code.
- Data only through `skin.config` / `skin.store`; never attempt to reach host
  tables, files, or the network.
- Routes must match the manifest declaration exactly; non-GET session/admin
  routes must set `csrf: true`.
- UI only through sandboxed iframes and the postMessage bridge; no attempts to
  break out of the frame or read host storage.
- Guards must set an explicit `onError` policy and a budget ≤50ms.
- No secrets in config schemas, form fields, logs, or UI assets.

## 5. Data and privacy

- Collect the minimum data needed; document what is stored and where.
- Do not log emails, IPs, tokens or passwords.
- Plugin data lives in its namespaced store; uninstall does not purge it unless
  the operator chooses to.

## 6. Review and merge

`pr.yml` runs without secrets and must pass. A maintainer then reviews against
[`REVIEW.md`](REVIEW.md). On merge, `sign.yml` (environment `market-signing`)
signs and publishes. Registry entries expire after 90 days; `resign.yml`
re-signs weekly when fewer than 30 days remain.

## 7. Removal / yank

Delete `plugins/<name>/` in a PR. The next signing run rebuilds the registry
without it; previously published artifacts stay in `v1/artifacts/` for audit and
for hosts that already installed them. Never delete an artifact to "unpublish".
