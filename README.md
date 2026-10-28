# SkinNexus plugin distribution

Static, signed plugin bundles for the SkinNexus plugin market.

- Registry: `https://yimingzhanshen.github.io/skin-nexus-plugins/v1/registry.json`
- Artifacts: `https://yimingzhanshen.github.io/skin-nexus-plugins/v1/artifacts/<name>-<version>.zip`

The registry and every bundle are Ed25519-signed. Installers must trust the
public key distributed out-of-band; this repository never contains private keys.

Published plugins:

- `config-greeter` — config schema + public route
- `nav-links` — UI page + user navigation
- `player-notes` — session routes + namespaced store + UI page

Artifacts are immutable: bump the plugin version instead of overwriting a zip.
Registry entries expire; a fresh registry must be signed and published before
the `expiresAt` timestamp.
