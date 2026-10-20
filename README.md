# My Skills Handbook  

Validate your Tailwind configuation and explore inherited and personal Cursor and Claude skills and rules.


## Prerequisites
Python 3.10+ (stdlib only).

## Installation

```bash
git clone https://github.com/boazmichaely/skills-handbook.git
cd skills-handbook
cp handbook.example.json handbook.json
# edit handbook.json for this machine (or use Settings → Edit configuration after start)
./serve.sh
```

Open http://127.0.0.1:8765 (that is the default port).

If 8765 is already in use, or you prefer another port, start with a different number, for example:

```bash
PORT=9000 ./serve.sh
```

Then open http://127.0.0.1:9000 instead.

## Upgrade
If you already cloned this repo:

```bash
cd /path/to/skills-handbook
git pull
# stop the old server (Ctrl-C), then:
./serve.sh
```

Hard-refresh the browser (Cmd+Shift+R).

Your local `handbook.json` is not in git and is not overwritten by `git pull`. 
After an upgrade, skim `handbook.example.json` once in case new keys were added; copy any new keys you need into your `handbook.json` (or set them in **Edit configuration**).

## Day to day

- `./serve.sh` rebuilds the catalog from disk, then serves the UI (localhost only).
- After skill/rule changes on disk: restart `./serve.sh`, then hard-refresh.
- **Settings** (gear): path findings and **# skills** counts. **Edit configuration** edits `handbook.json` in a form. Gray fields are unchanged defaults (not existence-checked until you edit them). Paths only - never paste secrets.
- Source and category filters are multi-select; **All** clears that group.
- `dist/skills.json` is generated locally and gitignored. Do not commit it.

## `handbook.json`

This file tells the handbook where to look on **your** computer. It is a list of folders and token-file paths - not the secrets themselves. If a path is wrong, a tab can look empty, filters can tag skills incorrectly, or Settings will show **missing**.

Start from `handbook.example.json` (the install step copies it to `handbook.json`). You can edit the file in a text editor, or use **Settings → Edit configuration** in the UI. Use `~` for your home directory; it expands when the handbook starts.

| Key | What it points at |
| --- | --- |
| `cursor.skills_dir` | Folder of Cursor skills (each subfolder with a `SKILL.md`) |
| `cursor.rules_dir` | Folder of Cursor rules (`*.mdc` files) |
| `claude.skills_dir` | Folder of Claude skills |
| `claude.rules_dir` | Folder of Claude rules (optional; use `""` if you do not use Claude rules) |
| `claude.claude_md_path` | Optional Claude memory file, usually `CLAUDE.md` (use `""` to skip) |
| `personal_skills_dir` | Your personal skills tree - names here count as **Personal** (use `""` if you have none) |
| `tailwind_dir` | Tailwind config directory (for the Tailwind config tab) |
| `tailwind_module_skills_dir` | Full Tailwind skills pack on disk. Leave `""` to use `{cursor.skills_dir}/.lola/modules/tailwind/skills` when that folder exists |
| `agents_skills_dir` | Add-on skills folder (for example gws); names here also count as **Tailwind** |
| `jira_apikey_path` | Path to your Jira API token **file** (status only in the UI - do not paste the token) |
| `rh_offline_token_path` | Path to the Red Hat Case Management offline token **file** (status only) |
| `rh_offline_token_plain_path` | Optional plain-KEY copy of that token if you use one (status only; `""` if unused) |

Typical defaults are in `handbook.example.json` (for example `~/.cursor/skills`, `~/.claude/skills`, `~/Projects/my-cursor-skills`, `~/.config/tailwind`, `~/.agents/skills`, and the `~/code/…` token file paths).

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

Open **Settings** (gear) first. Check **Suspicious** and the paths table: **Status**, **# skills**, and **Resolved path**. **# skills** is how many skill folders exist at that path - useful when Personal / Tailwind tagging looks wrong.

| What you see | Likely cause | What to do |
| --- | --- | --- |
| Cursor → Skills is empty or almost empty | `cursor.skills_dir` points at the wrong folder | Set it to your real Cursor skills directory (often `~/.cursor/skills`), then save or restart `./serve.sh` |
| Claude → Skills is empty (or the reverse of Cursor) | That runtime’s `skills_dir` is wrong, or you simply have no skills there | Check `claude.skills_dir` / `cursor.skills_dir` separately in Settings; empty can be normal |
| Claude → Rules missing expected files | `claude.rules_dir` or `claude.claude_md_path` wrong or unused | Fix the path, or set `""` if you do not use that file/folder |
| Only a handful of skills marked Tailwind (often gws-related) | Full pack path missing; only `agents_skills_dir` has skills | Confirm the pack folder exists (default under `…/.lola/modules/tailwind/skills`). Set `tailwind_module_skills_dir` or reinstall/sync the Tailwind pack into the Cursor skills tree |
| Everything tagged Personal or Tailwind incorrectly | `personal_skills_dir`, pack path, and/or `agents_skills_dir` do not match this machine | Fix those three keys; restart `./serve.sh` and hard-refresh |
| Settings says `handbook.json` is missing | Only the example file is in use | `cp handbook.example.json handbook.json` and edit for this machine |
| Path shows **missing** | Nothing on disk at that location | Create the folder/file, install the product that owns it, or correct the path |
| Tailwind config tab empty | `tailwind_dir` wrong, or you do not use Tailwind config here | Point it at `~/.config/tailwind`, or ignore an empty tab |
| Jira / Case Management config row looks wrong | Token **file** path wrong (the UI never shows the secret) | Fix `jira_apikey_path` or the `rh_offline_token_*` paths; do not paste tokens into `handbook.json` |
| UI did not change after editing paths or skills on disk | Catalog not rebuilt, or browser cache | Use **Edit configuration → Save and refresh catalog**, or stop and rerun `./serve.sh`, then hard-refresh (Cmd+Shift+R) |
| Edit configuration cannot load or save | App was not started with `./serve.sh` | Stop any plain static file server; run `./serve.sh` so the localhost API is available |
| Port already in use / page will not open on 8765 | Another process is using that port | `PORT=9000 ./serve.sh` (or another free port) and open that URL |

When origin tags still look wrong, compare **# skills** for `cursor.skills_dir`, the Tailwind pack path, and `agents_skills_dir`. If the pack count is near zero while agents is not, the pack path is the problem.
