#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

env_file=".env.local"
archive="${1:-oc-durable-sessions-demo.env.zip}"

if ! command -v zip >/dev/null 2>&1; then
  echo "zip is required to create the encrypted bundle." >&2
  exit 1
fi

if [[ ! -s "$env_file" ]]; then
  echo "$env_file is missing or empty. Configure it before creating a bundle." >&2
  exit 1
fi

if [[ -e "$archive" ]]; then
  echo "$archive already exists. Move or remove it first." >&2
  exit 1
fi

if ! git check-ignore --quiet "$archive"; then
  echo "Refusing to create an environment archive that Git does not ignore: $archive" >&2
  exit 1
fi

echo "Creating $archive. Enter a new password when zip prompts."
zip -ej "$archive" "$env_file"
chmod 600 "$archive"

echo "Created $archive"
echo "Share the archive out of band and send its password separately. Never commit it."
