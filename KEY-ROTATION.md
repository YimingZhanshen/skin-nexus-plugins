# Key rotation and registry expiry

## Routine expiry (automatic, both markets)

Registries are issued with a 90-day `expiresAt`. Nothing about renewal needs a
human:

| Market | Publish on push | Weekly renewal job | Secrets |
|---|---|---|---|
| plugin (`v1/`) | `sign.yml` | `resign.yml` — Mondays 03:17 UTC | `SKIN_PLUGIN_KEY` / `_KEY_ID` / `_TRUST_KEYS` |
| theme (`themes/v1/`) | `sign-themes.yml` | `resign-themes.yml` — Mondays 03:41 UTC | `SKIN_THEME_KEY` / `_KEY_ID` / `_TRUST_KEYS` |

Each renewal job reads its registry, prints the days left, and only runs the
signing job when **fewer than 60 days remain**. Two reasons for that number:

- it refreshes a month before the window where a failed run could realistically
  reach expiry;
- the refresh is itself a push, and GitHub auto-disables scheduled workflows on
  public repositories with no activity for 60 days. Refreshing at ~5 weeks keeps
  this repository "active" so the cron can never silently stop.

Signing is deterministic, so a renewal re-zips every pack, hard-fails if any
artifact byte differs (immutability), and commits only `registry.json` —
verified locally before every push: same `sha256` for all artifacts, only
`generatedAt`/`expiresAt` move.

Manual re-sign is still available: Actions → **Sign and publish market** /
**Sign and publish theme market** → Run workflow. If a signing run fails, Pages
keeps serving the previous copy until its `expiresAt`; hosts then reject the
registry (expired) even from their on-disk last-good cache — installed plugins
and themes keep working, and local uploads keep working, because only the
registry carries an expiry date.

A totally unattended repository therefore stays valid: renewals fire weekly from
the schedule, and each refresh is a push that resets the 60-day inactivity
clock. (If a schedule does ever get disabled — e.g. the repository is archived —
re-enable it with `gh workflow enable` or push a commit that touches the `cron`
line, which also reactivates it.)

## Rotating the signing key

The host accepts multiple keys via `SKIN_PLUGIN_TRUST_KEYS`, so rotation is
overlapping and does not require a host release.

1. Generate a new key offline:

   ```bash
   cd skin-nexus/server
   go run ./cmd/skin-plugin keygen --id market-YYYY-MM --out ~/keys/market-YYYY-MM.pem
   ```

2. Add the new public key to the host environment **alongside** the old one:

   ```env
   SKIN_PLUGIN_TRUST_KEYS=market-2026-10:<old-pub>,market-YYYY-MM:<new-pub>
   ```

   Redeploy with `docker compose up -d` (env changes need recreate).

3. Update the `market-signing` environment secrets:

   - `SKIN_PLUGIN_KEY` → new PEM
   - `SKIN_PLUGIN_KEY_ID` → new id
   - `SKIN_PLUGIN_TRUST_KEYS` → both keys while old artifacts are still served
     (the signing script verifies every zip in `v1/artifacts/`; an omitted key
     makes the registry rebuild fail)

4. Run **Sign and publish market**. The registry is now signed with the new key.
   Existing artifacts remain valid because their signatures are independent of
   the registry key.

5. After the old registry/artifacts are no longer needed (or at least one
   successful cycle later), remove the old public key from the host environment
   and from the environment secret. Mark the old entry retired in
   `v1/keys.json`.

## If the private key is lost

- Generate a new key, add its public key to the host, sign a new registry, and
  republish. Previously installed plugins keep working; new installs verify
  against the new registry/artifacts.
- Published artifacts signed by the lost key cannot be re-verified once its
  public key is removed; keep the old public key in the trust list while those
  versions are still installable.

## Transparency

`v1/keys.json` lists active and retired public keys for humans. Hosts never
consume it automatically; trust comes only from `SKIN_PLUGIN_TRUST_KEYS`.
