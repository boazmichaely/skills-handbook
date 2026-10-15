#!/usr/bin/env bash
# Regenerate the handbook catalog and serve it locally.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
python3 "$ROOT/generate.py"
PORT="${PORT:-8765}"
echo ""
echo "Skills handbook: http://127.0.0.1:${PORT}/"
echo "If Config looks empty after regenerate: hard-refresh (Cmd+Shift+R)."
echo "Ctrl-C to stop."
echo ""
exec python3 -m http.server "$PORT" --directory "$ROOT/dist" --bind 127.0.0.1
