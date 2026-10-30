# Skin Importer

Import Minecraft skins and capes from a Mojang username or a Blessing skin
detail URL into your own texture library. Optionally apply the imported
texture to one of your characters.

## What it does

- **Mojang username**: resolves the account, reads its public skin/cape
  textures, honors the `slim` model, and imports them as private textures.
- **Blessing URL**: accepts `https://<site>/skinlib/show/<tid>`, reads the
  public texture via the site's JSON `info` endpoint and raw texture endpoint,
  and appends the source (`name · 来源 host#tid`) to the display name.
- **Optional application**: select one of your characters to apply the
  imported skin/cape immediately.

Imports are private copies owned by the current user and can be applied to a
character; they are not published to the public library by this plugin.

## Requirements

- Host `>=0.5.0` with `net.http.v1` (scoped outbound HTTP) and the account
  bridge (`account.v1`).
- Permissions: `http:routes:session`, `net:http`, `textures:write`,
  `players:read`, `players:write`, `ui:page`, `ui:assets`.

## Security

- Outbound requests only go to Mojang hosts or the user's Blessing origin,
  through the host's SSRF guard (public IPs only, no redirects, size/time
  limits).
- No source-site login, cookies, or credentials are used.
- Only public Blessing textures are accepted; private/deleted textures are
  rejected with a clear error.
- Admin batch import is intentionally not part of this release.
