#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

archive="${1:-oc-durable-sessions-demo.env.zip}"
destination=".env.local"

if ! command -v unzip >/dev/null 2>&1; then
  echo "unzip is required to install the encrypted bundle." >&2
  exit 1
fi

if [[ ! -f "$archive" ]]; then
  echo "Encrypted bundle not found: $archive" >&2
  exit 1
fi

if [[ -e "$destination" ]]; then
  echo "$destination already exists. Move or remove it before installing the bundle." >&2
  exit 1
fi

if ! unzip -Z1 "$archive" | grep -qx '.env.local'; then
  echo "$archive does not contain the expected .env.local file." >&2
  exit 1
fi

temporary="$(mktemp "${TMPDIR:-/tmp}/oc-demo-env.XXXXXX")"
trap 'rm -f "$temporary"' EXIT

echo "Enter the bundle password when unzip prompts."
if ! unzip -p "$archive" .env.local >"$temporary"; then
  echo "Could not decrypt $archive." >&2
  exit 1
fi

if [[ ! -s "$temporary" ]]; then
  echo "The decrypted environment file is empty." >&2
  exit 1
fi

chmod 600 "$temporary"
mv "$temporary" "$destination"
trap - EXIT

echo "Installed $destination with owner-only permissions."
echo "Run: npm run doctor"
