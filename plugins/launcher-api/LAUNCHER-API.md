# SkinNexus Launcher API v1

The standard HTTP contract between a desktop launcher and a SkinNexus site.
It is served by the `launcher-api` plugin; sites without the plugin (or with it
disabled) return `404` and the launcher should fall back to the website.

- Base: `https://<site>/api/plugins/launcher-api/v1`
- Transport: HTTPS, JSON (UTF-8), raw PNG for uploads.
- Versioning: `/v1` is additive-only. New optional fields/features appear in
  `GET /meta`; breaking changes require `/v2`.
- This file is normative. The machine-readable schema is `openapi.yaml`.

## 1. Discovery

```http
GET /api/plugins/launcher-api/v1/meta
```

Public. Returns:

```json
{
  "apiVersion": 1,
  "features": {
    "bearer": true,
    "idempotentCreate": true,
    "players": true,
    "textureUpload": true,
    "cape": true,
    "library": true,
    "libraryImport": true
  },
  "models": ["default", "slim"],
  "limits": { "maxUploadBytes": 2097152, "libraryPerPage": 50 }
}
```

A launcher must check `404` (plugin absent/disabled) and `apiVersion` before
calling other endpoints. Unknown `features` keys must be ignored.

## 2. Authentication

Recommended: reuse the existing **Yggdrasil Connect OIDC device flow** (client
`2`, scopes `openid offline_access Yggdrasil.PlayerProfiles.Select
Yggdrasil.Server.Join`). Send the access token as:

```http
Authorization: Bearer <access_token>
```

The same header also accepts an opaque Yggdrasil `accessToken` from
`/authserver/authenticate` (compatibility for password-login sessions).

- No cookies are used. No CSRF header is required.
- Tokens must be kept secret; use HTTPS only.
- `401` → re-authenticate or refresh via `/oauth/token`.
- `403 auth.account_disabled` → banned account.
- Renaming or deleting a character can invalidate existing Yggdrasil tokens;
  refresh/re-login after those calls when continuing to play.

The API never accepts email/password, and never returns them.

## 3. Errors

```json
{ "error": "player.name_taken", "message": "该角色名已被占用" }
```

`error` is stable; `message` is display-only. HTTP status carries the class.

| HTTP | Codes |
|---|---|
| 400 | `player.name_invalid`, `texture.invalid`, `texture.type_mismatch` |
| 401 | `auth.required`, `auth.invalid_token` |
| 403 | `auth.account_disabled`, `texture.not_owned`, `account.forbidden` |
| 404 | `player.not_found`, `library.not_found` |
| 409 | `player.limit`, `player.name_taken` |
| 413 | `texture.too_large` |
| 429 | host rate limit; honor `Retry-After` |
| 500 | `internal` |
| 503 | `account.unavailable` (plugin not fully configured) |

## 4. Account

```http
GET /account
```

```json
{
  "id": 42,
  "nickname": "Steve",
  "permission": 0,
  "playerLimit": 3,
  "playerCount": 2,
  "avatarUrl": "https://skin.example/avatar/hash/<hash>",
  "storageBytes": 18342
}
```

`permission`: `0` normal, `>0` admin, `<0` banned (banned requests are already
rejected with 403).

## 5. Characters

### List / get

```http
GET /players
GET /players/{pid}
```

```json
{
  "players": [
    {
      "id": 7,
      "name": "Steve",
      "uuid": "6f8f57715090ded8aedc0c51a1a3f2b5",
      "skin": {
        "textureId": 12,
        "hash": "ab12…",
        "model": "slim",
        "url": "https://skin.example/textures/ab12…",
        "previewUrl": "https://skin.example/preview/12",
        "avatarUrl": "https://skin.example/avatar/hash/ab12…"
      },
      "cape": null
    }
  ]
}
```

`skin`/`cape` are `null` when unset. URLs are unauthenticated host URLs.

### Create

```http
POST /players
Content-Type: application/json

{ "name": "Alex" }
```

- `201` created, body is the player.
- `200` the same name already belongs to this account (retry-safe, `created=false`
  is not echoed in v1; the status distinguishes it).
- `409 player.name_taken` / `player.limit`; `400 player.name_invalid`.

The host applies the site's player-name rule and per-user limit.

### Rename

```http
PATCH /players/{pid}
{ "name": "Alex2" }
```

`200` returns the player plus `"tokensInvalidated": true` when the name changed.
Renaming to the current name is a no-op (`false`). UUID never changes.

### Delete

```http
DELETE /players/{pid}
```

`200 {"deleted":true}`. A retry after success may return `404`; treat that as
success. Textures are kept.

## 6. Appearance

### Upload or assign

```http
PUT /players/{pid}/skin?model=default|slim
Content-Type: image/png
<raw PNG bytes>
```

```http
PUT /players/{pid}/skin
Content-Type: application/json

{ "textureId": 12 }
```

Same for `/cape` (no `model`). Returns the updated player. `textureId` must be
one of the caller's own textures of the matching type. Uploads are re-encoded
and validated by the host (`image/png`, ≤2 MiB, skin/cape dimensions).

### Clear

```http
DELETE /players/{pid}/skin
DELETE /players/{pid}/cape
```

Returns the updated player (slot becomes `null`).

## 7. Textures

```http
GET /textures
```

```json
{ "textures": [ { "textureId": 12, "type": "skin", "hash": "ab12…", "model": "slim",
                  "description": "", "url": "…", "previewUrl": "…", "uploadedAt": "2026-10-28T12:00:00Z" } ] }
```

Standalone upload (not assigned to a character):

```http
POST /textures?type=skin&model=default&description=my-skin
Content-Type: image/png
<raw PNG bytes>
```

`201` created, `200` the same content already exists in the caller's library
(idempotent by `uid + type + hash`).

## 8. Skin library

```http
GET /library?type=&q=&sort=time|likes&page=1&per_page=20
GET /library/{tid}
```

Public textures only (plus the caller's own). Items include uploader nickname,
likes, `owned`, texture/preview/avatar URLs. `per_page` is capped at 50.

Import a public texture into the caller's private library (no file copy):

```http
POST /library/{tid}/import
```

`201` imported, `200` already owned. The private copy can then be assigned with
`PUT /players/{pid}/skin` + `{textureId}`.

## 9. Retries and idempotency

Launchers commonly retry. The API is designed for safe retries:

| Operation | Retry behavior |
|---|---|
| create player | same owned name → `200` with the existing player |
| rename | same name → `200`, `tokensInvalidated:false` |
| delete player | `404` after success is acceptable |
| set/clear texture | idempotent |
| upload/import texture | deduplicated by `(uid,type,hash)` |
| library reads | idempotent |

Do not retry `4xx` except `429` (honor `Retry-After`).

## 10. Limits

Advertised in `/meta` and enforced by the host/plugin:

- Upload ≤2 MiB (PNG is re-encoded; a smaller site limit may apply).
- Player count: per-user limit from the site (`/account.playerLimit`).
- Library page ≤50.
- Rate limits: reads 120/min; create 20/h; rename 30/h; delete 20/h; apply
  30/min; upload/import 10/min; meta 60/min. `429` + `Retry-After` otherwise.

## 11. Security notes for launchers

- Never log or persist access tokens in plain text beyond the launcher's
  credential store (the platform already stores Yggdrasil credentials).
- Treat every `4xx` as a user-facing condition, not a crash.
- Do not send cookies; do not use the browser session.
- The API is account-scoped: never cache another account's player/texture IDs.
- Character rename/delete can invalidate game tokens; refresh after the call.
