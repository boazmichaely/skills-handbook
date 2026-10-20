# My Skills Handbook

Local browser UI for Cursor and Claude skills/rules, plus Tailwind config status (paths only - never secrets).

Needs Python 3.10+ (stdlib only).

## Install

```bash
git clone https://github.com/boazmichaely/skills-handbook.git
cd skills-handbook
cp handbook.example.json handbook.json
# edit handbook.json for this machine (or use Settings → Edit configuration after start)
./serve.sh
```

Open http://127.0.0.1:8765  
Other port: `PORT=9000 ./serve.sh`

## Upgrade

If you already cloned this repo:

```bash
cd /path/to/skills-handbook
git pull
# stop the old server (Ctrl-C), then:
./serve.sh
```

Hard-refresh the browser (Cmd+Shift+R).

Your local `handbook.json` is not in git and is not overwritten by `git pull`. After an upgrade, skim `handbook.example.json` once in case new keys were added; copy any new keys you need into your `handbook.json` (or set them in **Edit configuration**).

## Day to day

- `./serve.sh` rebuilds the catalog from disk, then serves the UI (localhost only).
- After skill/rule changes on disk: restart `./serve.sh`, then hard-refresh.
- **Settings** (gear): path findings and **# skills** counts. **Edit configuration** edits `handbook.json` in a form. Gray fields are unchanged defaults (not existence-checked until you edit them). Paths only - never paste secrets.
- Source and category filters are multi-select; **All** clears that group.
- `dist/skills.json` is generated locally and gitignored. Do not commit it.

## `handbook.json`

Paths for **this** machine. `~` expands to your home directory. Copy from `handbook.example.json` if missing.

| Key | Points at | If wrong |
| --- | --- | --- |
| `cursor.skills_dir` | Cursor skills (`SKILL.md` folders) | Cursor → Skills empty/incomplete |
| `cursor.rules_dir` | Cursor rules (`*.mdc`) | Cursor → Rules empty/incomplete |
| `claude.skills_dir` | Claude skills | Claude → Skills empty/incomplete |
| `claude.rules_dir` | Claude rules (optional; `""` if unused) | Claude → Rules misses files |
| `claude.claude_md_path` | Optional `CLAUDE.md` (`""` to skip) | Missing under Claude → Rules |
| `personal_skills_dir` | Your personal skills tree (`""` if none) | Personal filter wrong |
| `tailwind_dir` | Tailwind config dir | Tailwind config tab empty/wrong |
| `tailwind_module_skills_dir` | Full Tailwind skills pack; `""` = `{cursor.skills_dir}/.lola/modules/tailwind/skills` when present | Few skills marked Tailwind (often only add-ons) |
| `agents_skills_dir` | Add-on skills (e.g. gws) | Those skills may look Personal |
| `jira_apikey_path` | Jira API token **file** (status only) | Jira config row wrong |
| `rh_offline_token_path` | Case Management offline token **file** (status only) | Support-case config row wrong |
| `rh_offline_token_plain_path` | Optional plain-KEY copy of that token (`""` if unused) | Same |

Defaults match `handbook.example.json` (`~/.cursor/skills`, `~/.claude/skills`, `~/Projects/my-cursor-skills`, `~/.config/tailwind`, `~/.agents/skills`, `~/code/.jira-apikey`, and the RH token paths).

### Personal vs Tailwind

Computed from folders - you do not list every skill.

| Signal | Tag |
| --- | --- |
| Name under `personal_skills_dir` | **Personal** (wins if also elsewhere) |
| Name under pack dir or `agents_skills_dir` | **Tailwind** |
| Else, if any Tailwind folder has skills | **Personal** |
| No personal dir and no Tailwind signals | **Tailwind** |

## For AI agents installing for someone

1. Clone (or `git pull` if present) into a normal projects folder - not inside another skills repo.
2. Ensure `handbook.json` exists; set paths for **this** user (ask if unknown).
3. `python3 --version` → 3.10+.
4. `./serve.sh` → give them http://127.0.0.1:8765
5. Check **Settings** for **found** and expected **# skills**.

Do not commit secrets or `dist/skills.json`.

## Troubleshooting

Start with **Settings** → **Suspicious** and the paths table.

| Symptom | Fix |
| --- | --- |
| Cursor → Skills almost empty | Fix `cursor.skills_dir` |
| Only a few skills marked Tailwind | Fix pack path (`tailwind_module_skills_dir` or default under `.lola/modules/tailwind/skills`) |
| Wrong Personal/Tailwind tags | Fix `personal_skills_dir`, pack, and `agents_skills_dir` |
| `handbook.json` missing warning | `cp handbook.example.json handbook.json` |
| Path **missing** | Create it, install the product, or correct the path |
| UI stale after edits | **Save and refresh catalog**, or restart `./serve.sh` + hard-refresh |
| Edit configuration cannot save | Must use `./serve.sh` (not a plain static file server) |
| Tailwind config tab empty | Fix `tailwind_dir` or ignore if unused |

Compare **# skills** on `cursor.skills_dir`, the Tailwind pack path, and `agents_skills_dir` when origin tags look wrong.
