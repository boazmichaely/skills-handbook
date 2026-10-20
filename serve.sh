#!/usr/bin/env bash
# Rebuild the catalog and serve the handbook (localhost only).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
python3 "$ROOT/generate.py"
PORT="${PORT:-8765}"
export PORT
echo ""
echo "If the UI looks empty or stale after changes: hard-refresh (Cmd+Shift+R)."
echo ""
exec python3 "$ROOT/server.py"
