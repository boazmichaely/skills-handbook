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

After you change `handbook.json` or install/remove skills on disk: stop the server (Ctrl-C), run `./serve.sh` again, then hard-refresh the browser.

`dist/skills.json` is written on your machine and gitignored. Do not commit it. Put only filesystem paths in `handbook.json`, never API keys or token contents.

## For AI agents installing this for someone

Do these steps in order. Do not invent paths; ask the user when a path is unknown.

1. Clone this repo (or `git pull` if it already exists) into a normal projects folder.
2. Ensure `handbook.json` exists (`cp handbook.example.json handbook.json` if missing).
3. Set every path in `handbook.json` to **this user's** machine (table below). Defaults with `~` are fine when they match; change `personal_skills_dir` to their personal skills repo or `""` if they have none.
4. Confirm Python 3.10+ is available (`python3 --version`).
5. Start with `./serve.sh` and tell the user the URL (`http://127.0.0.1:8765` unless `PORT` was set).
6. If the UI looks stale after config or skill changes: restart `./serve.sh` and hard-refresh the browser.

Do not commit secrets. Do not commit `dist/skills.json`.

## Personalize `handbook.json`

This file is how the handbook finds skills, rules, and Tailwind config on **this** machine. Wrong paths = empty tabs or the wrong tree.

Copy from `handbook.example.json`. Use `~` for the home directory; it expands when the handbook starts.

### What each key does

| Key | What it points at | What breaks if it is wrong |
| --- | --- | --- |
| `cursor.skills_dir` | Folder of Cursor skills (each subfolder with a `SKILL.md`) | Cursor → Skills is empty or incomplete |
| `cursor.rules_dir` | Folder of Cursor rules (`*.mdc` files) | Cursor → Rules is empty or incomplete |
| `claude.skills_dir` | Folder of Claude Code skills (`SKILL.md` subfolders) | Claude → Skills is empty or incomplete |
| `claude.rules_dir` | Folder of Claude rules (`*.md` files, searched recursively) | Claude → Rules misses those files |
| `claude.claude_md_path` | Optional single user memory file (usually `~/.claude/CLAUDE.md`) | That file does not appear under Claude → Rules; set `""` to skip |
| `personal_skills_dir` | *Your* skill source tree (folders that contain `SKILL.md`) | Skills from that tree are not tagged **Personal** in the All / Personal / Tailwind filter |
| `tailwind_dir` | Tailwind config directory (`tailwind.json`, `config.json`, `env.sh`, cache, artifacts) | Tailwind config tab is empty or wrong |
| `tailwind_module_skills_dir` | Lola’s installed Tailwind skill pack. Leave `""` to auto-use `{cursor.skills_dir}/.lola/modules/tailwind/skills` when that folder exists | Auto-detect of Tailwind-vs-Personal origin for Cursor skills is wrong; set an explicit path only if yours is nonstandard |
| `agents_skills_dir` | Agent skills folder (Tailwind’s gws-cli installs here, often also mirrored under Claude skills) | gws / agent skills may be tagged **Personal** instead of **Tailwind** |
| `jira_apikey_path` | Path to your Jira API token *file* (status only in the UI) | Tailwind config row for Jira shows missing/wrong |
| `rh_offline_token_path` | Path to Red Hat Case Management offline token file (status / metadata only) | Same for that config row |
| `rh_offline_token_plain_path` | Path to plain-KEY copy of that token if you use one (status only) | Same for that config row |

### Defaults (from `handbook.example.json`)

| Key | Default |
| --- | --- |
| `cursor.skills_dir` | `~/.cursor/skills` |
| `cursor.rules_dir` | `~/.cursor/rules` |
| `claude.skills_dir` | `~/.claude/skills` |
| `claude.rules_dir` | `~/.claude/rules` |
| `claude.claude_md_path` | `~/.claude/CLAUDE.md` |
| `personal_skills_dir` | `~/Projects/my-cursor-skills` (change this to *their* personal skills repo, or `""` if they do not have one) |
| `tailwind_dir` | `~/.config/tailwind` |
| `tailwind_module_skills_dir` | `""` (auto) |
| `agents_skills_dir` | `~/.agents/skills` |
| `jira_apikey_path` | `~/code/.jira-apikey` |
| `rh_offline_token_path` | `~/code/.rh-offline-token` |
| `rh_offline_token_plain_path` | `~/code/.rh-offline-token.plain` |

On Windows, keep the same keys and set full paths (or `~` if the environment expands it the way Python’s `Path.expanduser` expects).

### How Personal vs Tailwind is decided

The filter **All / Personal / Tailwind** is computed from these directories:

| Signal | Meaning |
| --- | --- |
| Skill id appears under `personal_skills_dir` (has `SKILL.md`) | **Personal** (wins if also listed elsewhere) |
| Skill id appears under the Lola module dir (`tailwind_module_skills_dir` or auto path) | **Tailwind** |
| Skill id appears under `agents_skills_dir` | **Tailwind** (e.g. gws-cli skills) |
| Everything else, when any Tailwind signal exists | **Personal** |
| No personal dir and no Tailwind signals | Treated as **Tailwind** (nothing to compare against) |

You do not list every skill by hand. Point the directories correctly; the handbook discovers folders that contain `SKILL.md`.

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
