# My Skills Handbook

Browse Cursor and Claude skills/rules on your Mac, plus local Tailwind config (paths and status only - never raw secrets).

## Install

Needs Python 3.10+ (stdlib only).

```bash
git clone https://github.com/boazmichaely/skills-handbook.git
cd skills-handbook
cp handbook.example.json handbook.json
```

Edit `handbook.json` if your paths differ from the defaults (`~/.cursor/skills`, `~/.claude/skills`, `~/.config/tailwind`, etc.).

## Run

```bash
./serve.sh
```

Open http://127.0.0.1:8765  
(`PORT=9000 ./serve.sh` to use another port.)

`./serve.sh` rebuilds the catalog from disk, then serves the UI. Rebuild only: `python3 generate.py`.

`dist/skills.json` is local and gitignored - do not commit it.
