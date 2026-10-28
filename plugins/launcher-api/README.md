# launcher-api

SkinNexus Launcher API v1 — a versioned REST surface for desktop launchers.
Normative contract: [`LAUNCHER-API.md`](LAUNCHER-API.md) · OpenAPI: [`openapi.yaml`](openapi.yaml).

## What it does

- Account summary and avatar URL
- Character list / get / create / rename / delete
- Skin & cape upload (raw PNG) or assign an existing texture; clear slots
- Own texture library and public skin-library browse/import
- Bearer auth (OIDC access token recommended; opaque Yggdrasil token accepted)

Base path: `/api/plugins/launcher-api/v1`. Discovery: `GET /v1/meta` (public).

## Requirements

- Host `>=0.4.0` with the `bearer-auth.v1`, `binary-body.v1` and `account.v1`
  capabilities.
- Permissions: `http:routes`, `http:routes:bearer`, `account:read`,
  `players:read`, `players:write`, `textures:read`, `textures:write`.

The plugin is a thin transport mapping; all ownership, name-policy, quota,
guard, event and audit behavior is enforced by the host account service.

## Installing

Signed bundle is published through the SkinNexus market
(`skin-nexus-plugins`). Install, enable, then point the launcher at
`https://<site>/api/plugins/launcher-api/v1/meta`.

## Security

- Bearer only; no cookies/CSRF. Use HTTPS.
- Character mutations can invalidate game tokens (rename); refresh afterwards.
- Library imports are private copies; the shared content-addressed file is not
  duplicated.
