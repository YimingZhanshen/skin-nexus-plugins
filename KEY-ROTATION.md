# Key rotation and registry expiry

## Routine expiry (automatic)

- `sign.yml` issues a 90-day registry.
- `resign.yml` runs every Monday, reads `v1/registry.json`, and dispatches
  `sign.yml` when fewer than 30 days remain.
- Manual re-sign: Actions → **Sign and publish market** → Run workflow.
- If a signing run fails, the Pages registry keeps serving the previous copy
  until its `expiresAt`; hosts return 503 after expiry.

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
