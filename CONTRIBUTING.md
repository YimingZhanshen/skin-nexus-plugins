# Contributing

## Before you start

- Read [`SPEC.md`](SPEC.md) and the host plugin spec.
- One plugin per pull request. Version bumps are separate PRs from new plugins.
- Check the name is not already published in `v1/registry.json`.

## Add or update a plugin

1. Fork this repository.
2. Add `plugins/<name>/` (`plugin.json`, `index.js`, `market.json`; optional
   `ui/` and `README.md`). Copy an existing plugin as a template.
3. Bump `version` in both `plugin.json` and `market.json` when changing a
   published plugin. Never reuse a version.
4. Run the local linter:

   ```bash
   git clone https://github.com/YimingZhanshen/skin-nexus .server
   (cd .server/server && go build -o /tmp/skin-plugin ./cmd/skin-plugin)
   /tmp/skin-plugin lint --dir plugins/<name> --registry v1/registry.json --host-version 0.4.0 --json
   ```

5. Open a PR and describe:
   - what the plugin does;
   - why each permission is needed;
   - what data it stores and for how long;
   - any external hosts it references (`media.avatarHosts`).

## Review and publishing

- `pr.yml` validates the manifest, `market.json`, archive safety, permissions,
  forbidden files and version monotonicity. It has no signing key.
- A maintainer reviews against [`REVIEW.md`](REVIEW.md).
- After merge, `sign.yml` packs and signs the plugin, rebuilds
  `v1/registry.json`, commits it and updates Pages. The host market refreshes
  within 10 minutes.
- Same version + different bytes is rejected by the signing script. Published
  artifacts are immutable.

## Security

- Never commit private keys, tokens, or customer data.
- Do not add native binaries, obfuscated JS, or remote code loading.
- Do not attempt to bypass the sandbox, route tiers, or guard semantics.
- Report a security issue privately instead of opening a public PR.

## License

By contributing you agree that your contribution is licensed under the terms
in [`LICENSE.md`](LICENSE.md), unless the plugin directory contains its own
compatible `LICENSE`.
