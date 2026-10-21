#!/usr/bin/env bash
# Rebuild the catalog and serve the handbook (localhost only).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
# Local-only config (gitignored). Create from the example if missing so upgrades
# that drop an old tracked copy still leave a usable handbook.json.
if [[ ! -f "$ROOT/handbook.json" ]]; then
  if [[ ! -f "$ROOT/handbook.example.json" ]]; then
    echo "Missing handbook.example.json - cannot create handbook.json" >&2
    exit 1
  fi
  cp "$ROOT/handbook.example.json" "$ROOT/handbook.json"
  echo "Created handbook.json from handbook.example.json (edit paths for this machine)."
  echo ""
fi
python3 "$ROOT/generate.py"
PORT="${PORT:-8765}"
export PORT
echo ""
echo "If the UI looks empty or stale after changes: hard-refresh (Cmd+Shift+R)."
echo ""
exec python3 "$ROOT/server.py"
