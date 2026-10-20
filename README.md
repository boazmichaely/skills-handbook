# My Skills Handbook

Browse local Cursor and Claude skills/rules, plus Tailwind config (paths and status only - never raw secrets).

## Install and run

Needs Python 3.10+ (stdlib only).

```bash
git clone https://github.com/boazmichaely/skills-handbook.git
cd skills-handbook
cp handbook.example.json handbook.json
# edit handbook.json - see below
./serve.sh
```

Open http://127.0.0.1:8765  
(`PORT=9000 ./serve.sh` for another port.)

After you change `handbook.json` or add/remove skills on disk: stop the server (Ctrl-C), run `./serve.sh` again, then hard-refresh the browser.

**Settings** (gear, top right) shows path findings and **# skills** counts. Use **[edit configuration]** next to the `handbook.json` path to change paths in a form (validates folders/files when you leave a field), then **Save and refresh catalog** (localhost only, via `./serve.sh`). Paths only - never paste secrets.

`dist/skills.json` is written on your machine and gitignored. Do not commit it.

## For AI agents installing this for someone

Do these steps in order. Do not invent paths; ask the user when a path is unknown.

1. Clone this repo (or `git pull` if it already exists) into a normal projects folder.
2. Ensure `handbook.json` exists (`cp handbook.example.json handbook.json` if missing).
3. Set every path in `handbook.json` to **this user's** machine (tables below). Defaults with `~` are fine when they match; change `personal_skills_dir` to their personal skills repo or `""` if they have none.
4. Confirm Python 3.10+ (`python3 --version`).
5. Start with `./serve.sh` and give them the URL (`http://127.0.0.1:8765` unless `PORT` was set).
6. Open **Settings** in the UI and confirm paths show **found** with expected **# skills**. Fix paths via **[edit configuration]** or in `handbook.json`, then save / restart as needed.
7. If the UI looks stale after skill changes on disk: restart `./serve.sh` and hard-refresh the browser.

Do not commit secrets. Do not commit `dist/skills.json`.

## Personalize `handbook.json`

This file is how the handbook finds skills, rules, and Tailwind config on **this** machine. Wrong paths mean empty tabs, the wrong tree, or a broken All / Personal / Tailwind filter.

Copy from `handbook.example.json`. Use `~` for the home directory; it expands when the handbook starts.

### What each key does

| Key | What it points at | What breaks if it is wrong |
| --- | --- | --- |
| `cursor.skills_dir` | Folder of Cursor skills (each subfolder with a `SKILL.md`) | Cursor → Skills is empty or incomplete |
| `cursor.rules_dir` | Folder of Cursor rules (`*.mdc` files) | Cursor → Rules is empty or incomplete |
| `claude.skills_dir` | Folder of Claude Code skills (`SKILL.md` subfolders) | Claude → Skills is empty or incomplete |
| `claude.rules_dir` | Folder of Claude rules (`*.md` files, searched recursively) | Claude → Rules misses those files |
| `claude.claude_md_path` | Optional single user memory file (usually `~/.claude/CLAUDE.md`) | That file does not appear under Claude → Rules; set `""` to skip |
| `personal_skills_dir` | Your skill source tree (folders that contain `SKILL.md`) | Skills from that tree are not marked **Personal** |
| `tailwind_dir` | Tailwind config directory (`tailwind.json`, `config.json`, `env.sh`, cache, artifacts) | Tailwind config tab is empty or wrong |
| `tailwind_module_skills_dir` | Full Tailwind skills pack on disk. Leave `""` to use `{cursor.skills_dir}/.lola/modules/tailwind/skills` when that folder exists | All / Personal / Tailwind cannot mark the full Tailwind set (often you only see add-ons such as gws) |
| `agents_skills_dir` | Add-on skills folder (for example gws); often mirrored under Claude skills | Those skills may be marked **Personal** instead of **Tailwind** |
| `jira_apikey_path` | Path to your Jira API token *file* (status only in the UI) | Tailwind config row for Jira shows missing/wrong |
| `rh_offline_token_path` | Path to Red Hat Case Management offline token file (status only) | Same for that config row |
| `rh_offline_token_plain_path` | Path to plain-KEY copy of that token if you use one (status only) | Same for that config row |

### Defaults (from `handbook.example.json`)

| Key | Default |
| --- | --- |
| `cursor.skills_dir` | `~/.cursor/skills` |
| `cursor.rules_dir` | `~/.cursor/rules` |
| `claude.skills_dir` | `~/.claude/skills` |
| `claude.rules_dir` | `~/.claude/rules` |
| `claude.claude_md_path` | `~/.claude/CLAUDE.md` |
| `personal_skills_dir` | `~/Projects/my-cursor-skills` (change to their personal skills repo, or `""` if none) |
| `tailwind_dir` | `~/.config/tailwind` |
| `tailwind_module_skills_dir` | `""` (use the default pack path under Cursor skills when present) |
| `agents_skills_dir` | `~/.agents/skills` |
| `jira_apikey_path` | `~/code/.jira-apikey` |
| `rh_offline_token_path` | `~/code/.rh-offline-token` |
| `rh_offline_token_plain_path` | `~/code/.rh-offline-token.plain` |

On Windows, keep the same keys and set full paths (or `~` if the environment expands it the way Python’s `Path.expanduser` expects).

### How Personal vs Tailwind is decided

The filter **All / Personal / Tailwind** is computed from folders in `handbook.json`. You do not list every skill by hand.

| Signal | Meaning |
| --- | --- |
| Skill name appears under `personal_skills_dir` (has `SKILL.md`) | **Personal** (wins if also listed elsewhere) |
| Skill name appears under `tailwind_module_skills_dir` (or the default pack path) | **Tailwind** |
| Skill name appears under `agents_skills_dir` | **Tailwind** (for example gws) |
| Everything else, when any Tailwind folder above has skills | **Personal** |
| No personal dir and no Tailwind signals | Treated as **Tailwind** |

### Minimal example

```json
{
  "cursor": {
    "skills_dir": "~/.cursor/skills",
    "rules_dir": "~/.cursor/rules"
  },
  "claude": {
    "skills_dir": "~/.claude/skills",
    "rules_dir": "~/.claude/rules",
    "claude_md_path": "~/.claude/CLAUDE.md"
  },
  "personal_skills_dir": "~/Projects/my-cursor-skills",
  "tailwind_dir": "~/.config/tailwind",
  "tailwind_module_skills_dir": "",
  "agents_skills_dir": "~/.agents/skills",
  "jira_apikey_path": "~/code/.jira-apikey",
  "rh_offline_token_path": "~/code/.rh-offline-token",
  "rh_offline_token_plain_path": "~/code/.rh-offline-token.plain"
}
```

If Claude is unused, leave the `claude` paths as defaults (empty tabs are fine). If Tailwind is unused, the Tailwind config tab may be empty. If there is no personal skills repo, set `"personal_skills_dir": ""`.

## Troubleshooting

Use **Settings** first. Check **Suspicious** and the paths table (**Status**, **# skills**, **Resolved path**).

| What you see | Likely cause | What to do |
| --- | --- | --- |
| Cursor → Skills almost empty | `cursor.skills_dir` points at the wrong folder | Set it to the real Cursor skills directory (often `~/.cursor/skills`) |
| Only a handful of skills marked Tailwind (often gws-related) | `tailwind_module_skills_dir` missing or wrong; only `agents_skills_dir` has skills | Confirm the full Tailwind pack folder exists (default under `…/.lola/modules/tailwind/skills`). Fix the path or reinstall/sync Tailwind skills into the Cursor skills tree |
| Everything marked Personal or Tailwind incorrectly | `personal_skills_dir` / pack / agents paths do not match this machine | Fix those three keys; restart `./serve.sh` |
| Settings warns that `handbook.json` is missing | Only `handbook.example.json` is in use | `cp handbook.example.json handbook.json` and edit |
| Path shows **missing** | Folder or file is not on disk at that location | Create it, install the product that owns it, or correct the path |
| Claude → Skills has items but Cursor does not (or the reverse) | Different install trees; that can be normal | Check each runtime’s `skills_dir` separately in Settings |
| UI did not change after editing `handbook.json` | Catalog not rebuilt, or browser cache | Use **[edit configuration]** → **Save and refresh catalog**, or restart `./serve.sh`, then hard-refresh |
| Edit configuration cannot load or save | App was not started with `./serve.sh` | Stop any plain static server; run `./serve.sh` so the localhost save API is available |
| Tailwind config tab empty | `tailwind_dir` wrong or unused | Point at `~/.config/tailwind` or accept an empty tab |
| `file://` link in Settings does not open | Browser blocks local file links from `http://127.0.0.1` | Copy the path into your editor |

Still stuck: compare **# skills** on `cursor.skills_dir`, `tailwind_module_skills_dir`, and `agents_skills_dir`. If the pack folder’s count is near zero while agents is not, the Tailwind pack path is the problem.
