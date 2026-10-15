# My Skills Handbook

Local browser UI for Cursor and Claude skills/rules, plus Tailwind config on your machine.

## Install

```bash
git clone https://github.com/boazmichaely/skills-handbook.git
cd skills-handbook
cp handbook.example.json handbook.json   # edit paths if needed
```

Requires Python 3.10+ (stdlib only).

## Run

```bash
./serve.sh
# open http://127.0.0.1:8765
```

`serve.sh` regenerates the catalog, then serves `dist/` on `127.0.0.1` (port via `PORT`, default `8765`).

Regenerate only:

```bash
python3 generate.py
```

## UI

| Top tab | Contents |
| --- | --- |
| **Cursor** | Skills + Rules from the Cursor paths in `handbook.json` |
| **Claude** | Skills + Rules from the Claude paths (plus optional `~/.claude/CLAUDE.md`) |
| **Config** | Local Tailwind / token settings (`tailwind.json`, status, cache, artifacts) |

Under Cursor / Claude: **Skills** or **Rules**. Skills keep All / Personal / Tailwind origin filters.

## Data sources

Configured in `handbook.json` (see `handbook.example.json`):

| Key | Default | Used for |
| --- | --- | --- |
| `cursor.skills_dir` / `cursor.rules_dir` | `~/.cursor/skills`, `~/.cursor/rules` | Cursor tab |
| `claude.skills_dir` / `claude.rules_dir` | `~/.claude/skills`, `~/.claude/rules` | Claude tab |
| `claude.claude_md_path` | `~/.claude/CLAUDE.md` | Included as a Claude rule when present |
| `personal_skills_dir` | optional | Personal origin (folders with `SKILL.md`) |
| `tailwind_dir` | `~/.config/tailwind` | Config tab |
| `tailwind_module_skills_dir` | auto | Tailwind origin; empty means `{cursor.skills_dir}/.lola/modules/tailwind/skills` when present |
| `agents_skills_dir` | `~/.agents/skills` | Also Tailwind origin (gws-cli installs here + into Claude skills) |
| token paths | `~/code/...` | Config tab secret status only (never raw secret values) |

**Origin filters:** if the Lola Tailwind module skills dir exists, skills listed there are Tailwind; other installed skills are Personal. `personal_skills_dir` overrides. Categories use built-in heuristics.

`dist/skills.json` is generated locally and gitignored. Do not commit secrets; `handbook.json` should hold paths only.

## Older version on GitHub (before Cursor / Claude / Tailwind tabs)

Saved on GitHub so you can open or restore it anytime:

- https://github.com/boazmichaely/skills-handbook/tree/backup/pre-cursor-claude-tabs
- https://github.com/boazmichaely/skills-handbook/tree/backup-pre-dual-runtime

On either page: green **Code** button → **Download ZIP** if you just want that snapshot as files.
