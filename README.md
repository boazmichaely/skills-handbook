# Skills handbook

Local browser UI for Cursor skills, rules, and Tailwind config on your machine.

## Install

```bash
git clone <repo-url> skills-handbook
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

## Data sources

Configured in `handbook.json` (see `handbook.example.json`):

| Key | Default | Used for |
| --- | --- | --- |
| `skills_dir` | `~/.cursor/skills` | Skills tab (each folder with `SKILL.md`) |
| `rules_dir` | `~/.cursor/rules` | Rules tab (`*.mdc`) |
| `personal_skills_dir` | optional | Personal origin: folders here with `SKILL.md` |
| `tailwind_dir` | `~/.config/tailwind` | Config tab (`tailwind.json`, `config.json`, `env.sh`, cache, artifacts) |
| `tailwind_module_skills_dir` | auto | Tailwind origin; empty means `{skills_dir}/.lola/modules/tailwind/skills` when present |
| `jira_apikey_path` / `rh_offline_token_*` | `~/code/...` | Config tab secret status only (never raw values in the UI for redacted files) |

**Origin filters (Personal / Tailwind):** if the Lola Tailwind module skills dir exists, skills listed there are Tailwind; other installed skills are Personal. If `personal_skills_dir` is set, those skill IDs are treated as Personal (override). Categories use built-in heuristics.

`dist/skills.json` is generated locally and gitignored (can contain full skill bodies). Do not commit secrets; `handbook.json` should hold paths only.
