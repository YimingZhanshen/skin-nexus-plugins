#!/usr/bin/env bash
# Sign every plugin, refresh the registry, and verify it. Used by CI and by a
# maintainer locally. The private key is read from a file path and never
# printed; artifacts are immutable (same version + same bytes, or hard fail).
set -euo pipefail

: "${SKIN_PLUGIN_CLI:?set SKIN_PLUGIN_CLI to the skin-plugin binary}"
: "${SKIN_PLUGIN_KEY_FILE:?set SKIN_PLUGIN_KEY_FILE to the PKCS#8 PEM path}"
: "${SKIN_PLUGIN_KEY_ID:?set SKIN_PLUGIN_KEY_ID}"
: "${MARKET_URL_BASE:?set MARKET_URL_BASE (https artifact base)}"
: "${SKIN_PLUGIN_TRUST_KEYS:?set SKIN_PLUGIN_TRUST_KEYS to verify the result}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p v1/artifacts

changed=0
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
for dir in plugins/*/; do
  [[ -d "$dir" ]] || continue
  name="$(basename "$dir")"
  version="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$dir/plugin.json" | head -n1)"
  [[ -n "$version" ]] || { echo "missing version in $dir/plugin.json" >&2; exit 1; }
  artifact="v1/artifacts/$name-$version.zip"

  tmp="$work/$name-$version.zip"
  "$SKIN_PLUGIN_CLI" pack --dir "$dir" --out "$tmp" --key "$SKIN_PLUGIN_KEY_FILE" \
    --key-id "$SKIN_PLUGIN_KEY_ID" --force --json >/dev/null
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

"$SKIN_PLUGIN_CLI" registry --dist v1/artifacts --url-base "$MARKET_URL_BASE" \
  --key "$SKIN_PLUGIN_KEY_FILE" --key-id "$SKIN_PLUGIN_KEY_ID" \
  --expires-days 90 --out v1/registry.json --json
"$SKIN_PLUGIN_CLI" verify-registry --registry v1/registry.json \
  --keys "$SKIN_PLUGIN_TRUST_KEYS" --json

echo "market signed (artifacts_changed=$changed)"
