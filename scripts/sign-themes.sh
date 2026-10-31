#!/usr/bin/env bash
# Sign every theme pack, refresh the theme registry, and verify it. Same
# discipline as sign-market.sh: private key from a file path only, artifacts
# immutable per version, independent key id namespace (theme-*).
set -euo pipefail

: "${SKIN_PLUGIN_CLI:?set SKIN_PLUGIN_CLI to the skin-plugin binary}"
: "${SKIN_THEME_KEY_FILE:?set SKIN_THEME_KEY_FILE to the PKCS#8 PEM path}"
: "${SKIN_THEME_KEY_ID:?set SKIN_THEME_KEY_ID}"
: "${THEME_MARKET_URL_BASE:?set THEME_MARKET_URL_BASE (https artifact base)}"
: "${SKIN_THEME_TRUST_KEYS:?set SKIN_THEME_TRUST_KEYS to verify the result}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p themes/v1/artifacts

changed=0
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
for dir in themes/*/; do
  [[ -d "$dir" ]] || continue
  name="$(basename "$dir")"
  [[ "$name" == "v1" ]] && continue   # generated output, not a source pack
  version="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$dir/theme.json" | head -n1)"
  [[ -n "$version" ]] || { echo "missing version in $dir/theme.json" >&2; exit 1; }
  artifact="themes/v1/artifacts/$name-$version.zip"

  tmp="$work/$name-$version.zip"
  "$SKIN_PLUGIN_CLI" pack-theme --dir "$dir" --out "$tmp" --key "$SKIN_THEME_KEY_FILE" \
    --key-id "$SKIN_THEME_KEY_ID" --force --json >/dev/null
  new_sha="$(sha256sum "$tmp" | cut -d' ' -f1)"

  if [[ -f "$artifact" ]]; then
    old_sha="$(sha256sum "$artifact" | cut -d' ' -f1)"
    if [[ "$old_sha" != "$new_sha" ]]; then
      echo "artifact immutability violation: $artifact changed for the same version" >&2
      exit 1
    fi
    echo "unchanged: $artifact"
  else
    cp "$tmp" "$artifact"
    echo "signed: $artifact"
    changed=1
  fi
done

"$SKIN_PLUGIN_CLI" registry --kind theme --dist themes/v1/artifacts \
  --url-base "$THEME_MARKET_URL_BASE" \
  --key "$SKIN_THEME_KEY_FILE" --key-id "$SKIN_THEME_KEY_ID" \
  --expires-days 90 --out themes/v1/registry.json --json
"$SKIN_PLUGIN_CLI" verify-registry --registry themes/v1/registry.json \
  --keys "$SKIN_THEME_TRUST_KEYS" --json

echo "theme market signed (artifacts_changed=$changed)"
