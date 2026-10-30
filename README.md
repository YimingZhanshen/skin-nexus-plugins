# SkinNexus plugin repository

Source of truth for official SkinNexus plugins and the signed plugin market.

- Registry: `https://yimingzhanshen.github.io/skin-nexus-plugins/v1/registry.json`
- Artifacts: `https://yimingzhanshen.github.io/skin-nexus-plugins/v1/artifacts/<name>-<version>.zip`
- Host project: <https://github.com/YimingZhanshen/skin-nexus>
- Plugin spec (normative): <https://github.com/YimingZhanshen/skin-nexus/blob/main/docs/plugin-spec.md>

Every bundle and the registry are Ed25519-signed. The private key exists only as
an environment secret in this repository's `market-signing` environment and in
the maintainer's offline backup. Pull-request workflows never receive it.

## Plugins

| Name | What it does |
|---|---|
| `config-greeter` | config schema + public route |
| `nav-links` | UI page + user navigation |
| `player-notes` | session routes + namespaced store + UI page |
| `texture-cdn` | rewrite skin texture URLs to a CDN |
| `lifecycle-log` | log register/login/delete and join phases |
| `signup-guard` | fail-closed registration guard by email domain |
| `texture-provenance` | upload source/credit fields + detail-page slot |
| `signup-survey` | registration source survey stored per user |
| `avatar-cdn` | `/avatar/*` redirect to an allowlisted renderer |
| `name-policy` | reserved names on register/profile/rename |
| `launcher-api` | Launcher API v1: account, characters, textures, library |
| `skin-importer` | Import Mojang/Blessing skins and capes into a personal library |

## Repository layout

```
plugins/<name>/          # plugin source (plugin.json, index.js, ui/, market.json, README)
v1/registry.json         # generated, signed, committed
v1/artifacts/*.zip       # generated, signed, immutable, committed
v1/keys.json             # optional public key transparency list
scripts/sign-market.sh   # local/CI signing entry point
```

## Contributing a plugin

1. Fork this repository and add `plugins/<name>/` following
   [`SPEC.md`](SPEC.md) and the host's plugin spec.
2. Run the checks locally:

   ```bash
   git clone https://github.com/YimingZhanshen/skin-nexus .server
   (cd .server/server && go build -o /tmp/skin-plugin ./cmd/skin-plugin)
   /tmp/skin-plugin lint --dir plugins/<name> --registry v1/registry.json --host-version 0.5.0 --json
   ```

   `skin-importer` uses the host `net:http` / `schedule:jobs` capabilities and
   must be linted with `--host-version 0.5.0` (host `>=0.5.0`).

3. Open a PR. CI validates the manifest, market metadata, archive safety,
   permissions and version monotonicity without any signing key.
4. After review and merge, the signing workflow (environment `market-signing`)
   packs, signs, rebuilds `v1/registry.json`, commits it, and Pages serves it.
   The host market refreshes within its 10-minute cache.

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`REVIEW.md`](REVIEW.md) before
submitting. Versions are immutable: bump `version` instead of replacing a zip.

Community: [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) ·
[`SECURITY.md`](SECURITY.md) · [`ACCESSIBILITY.md`](ACCESSIBILITY.md).

## Local signing (maintainer)

```bash
SKIN_PLUGIN_CLI=/path/to/skin-plugin \
SKIN_PLUGIN_KEY_FILE=~/keys/market-2026-10.pem \
SKIN_PLUGIN_KEY_ID=market-2026-10 \
SKIN_PLUGIN_TRUST_KEYS=market-2026-10:<base64-public-key> \
MARKET_URL_BASE=https://yimingzhanshen.github.io/skin-nexus-plugins/v1/artifacts \
scripts/sign-market.sh
```

Then review and commit `v1/`.

## Maintainer setup

Create a GitHub environment named `market-signing` with these environment
secrets (environment-scoped secrets are not exposed to `pull_request` runs):

| Secret | Content |
|---|---|
| `SKIN_PLUGIN_KEY` | Ed25519 private key, PKCS#8 PEM |
| `SKIN_PLUGIN_KEY_ID` | key id, e.g. `market-2026-10` |
| `SKIN_PLUGIN_TRUST_KEYS` | `id:base64-public-key` list used to self-verify; must include every key that signed an artifact still present in `v1/artifacts/` |

Optional repository variables: `SKIN_SERVER_REF` (default `main`) and
`SKIN_HOST_VERSION` (default `0.5.0`). Allow `github-actions[bot]` to push to
`main`, or change `sign.yml` to open a PR with the signed `v1/` changes.
See [`KEY-ROTATION.md`](KEY-ROTATION.md) for rotation and expiry.

## Downstream deployments

The SkinNexus server points at this registry by default. A fork or private
deployment can override `SKIN_PLUGIN_MARKET_URL` (and `SKIN_PLUGIN_TRUST_KEYS`)
to use its own market; setting the URL to an empty string disables the market.

## License

AGPL-3.0 — see [`LICENSE.md`](LICENSE.md). A plugin directory may ship its own
compatible `LICENSE`, which then applies to that plugin.
