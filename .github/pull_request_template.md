## What changed

<!-- New plugin, version bump, or fix. Link issues with "Closes #123". -->

## Checklist

- [ ] One plugin per PR; version bumped in both `plugin.json` and `market.json`
- [ ] `market.json.capabilities` equals `plugin.json.permissions`; `requires` / `conflicts` / `minServer` match
- [ ] Local lint passes (`skin-plugin lint --json`) — paste the real output below
- [ ] Every non-trivial permission is justified in the README or this description
- [ ] No keys, tokens, personal data, obfuscated code, native binaries or remote JS
- [ ] UI assets exist for every declared page/slot; no sandbox or route-tier workarounds
- [ ] Guards set explicit `onError` + ≤50ms budget; non-GET session/admin routes set `csrf: true`
- [ ] Read [`SPEC.md`](SPEC.md), [`REVIEW.md`](REVIEW.md) and the host plugin spec
- [ ] AI-assisted contributions are disclosed; the submitter is responsible for the output

## Verification

```
$ ...
```
