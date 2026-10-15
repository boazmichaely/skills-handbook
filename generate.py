#!/usr/bin/env python3
"""Scan Cursor skills (+ rules) and emit dist/skills.json for the local handbook.

Paths and origin discovery are driven by handbook.json (see handbook.example.json).
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
HOME = Path.home()

DEFAULT_CONFIG: dict = {
    "cursor": {
        "skills_dir": "~/.cursor/skills",
        "rules_dir": "~/.cursor/rules",
    },
    "claude": {
        "skills_dir": "~/.claude/skills",
        "rules_dir": "~/.claude/rules",
        "claude_md_path": "~/.claude/CLAUDE.md",
    },
    "personal_skills_dir": "",
    "tailwind_dir": "~/.config/tailwind",
    # Empty = auto: {cursor.skills_dir}/.lola/modules/tailwind/skills
    "tailwind_module_skills_dir": "",
    "jira_apikey_path": "~/code/.jira-apikey",
    "rh_offline_token_path": "~/code/.rh-offline-token",
    "rh_offline_token_plain_path": "~/code/.rh-offline-token.plain",
}

# Populated by load_config() / apply_config()
CURSOR_SKILLS_DIR = HOME / ".cursor" / "skills"
CURSOR_RULES_DIR = HOME / ".cursor" / "rules"
CLAUDE_SKILLS_DIR = HOME / ".claude" / "skills"
CLAUDE_RULES_DIR = HOME / ".claude" / "rules"
CLAUDE_MD_PATH: Path | None = HOME / ".claude" / "CLAUDE.md"
TW_DIR = HOME / ".config" / "tailwind"
PERSONAL_SKILLS_DIR: Path | None = None
TW_MODULE_SKILLS_DIR: Path | None = None
JIRA_APIKEY_PATH = HOME / "code" / ".jira-apikey"
RH_OFFLINE_TOKEN_PATH = HOME / "code" / ".rh-offline-token"
RH_OFFLINE_TOKEN_PLAIN_PATH = HOME / "code" / ".rh-offline-token.plain"
# Active while scanning one runtime's skills
ORIGIN_BY_ID: dict[str, str] = {}
# Legacy aliases used by collect_config support-cases path
SKILLS_DIR = CURSOR_SKILLS_DIR

# At most 7 handbook categories (stable labels for filters + table).
CATEGORY_ORDER = [
    "Jira & RFE",
    "Roadmap & decisions",
    "Product marketing",
    "Brand & quality",
    "Data & research",
    "Daily ops",
    "Platform & tools",
]

DAILY_OPS_IDS = {
    "mentions-digest",
    "gws-morning-briefing",
    "jira-brief",
    "jira-inbox",
    "gcal-fetch",
    "gdoc-fetch",
}


def expand_path(value: str | Path) -> Path:
    return Path(str(value)).expanduser()


def _deep_merge(base: dict, overlay: dict) -> dict:
    out = dict(base)
    for key, val in overlay.items():
        if key in out and isinstance(out[key], dict) and isinstance(val, dict):
            out[key] = _deep_merge(out[key], val)
        else:
            out[key] = val
    return out


def _normalize_legacy_config(data: dict) -> dict:
    """Map flat skills_dir/rules_dir (pre dual-runtime) onto cursor.*."""
    data = dict(data)
    cursor = dict(data.get("cursor") or {})
    if "skills_dir" in data and "skills_dir" not in cursor:
        cursor["skills_dir"] = data.pop("skills_dir")
    if "rules_dir" in data and "rules_dir" not in cursor:
        cursor["rules_dir"] = data.pop("rules_dir")
    if cursor:
        data["cursor"] = cursor
    return data


def load_config() -> dict:
    """Merge handbook.json (or handbook.example.json) over defaults."""
    cfg = _deep_merge({}, DEFAULT_CONFIG)
    for name in ("handbook.json", "handbook.example.json"):
        path = ROOT / name
        if not path.is_file():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise SystemExit(f"Invalid {path.name}: {exc}") from exc
        if not isinstance(data, dict):
            raise SystemExit(f"{path.name} must be a JSON object")
        data = _normalize_legacy_config(data)
        cfg = _deep_merge(cfg, {k: v for k, v in data.items() if k in DEFAULT_CONFIG or k in ("cursor", "claude")})
        break
    return cfg


def apply_config(cfg: dict) -> None:
    global CURSOR_SKILLS_DIR, CURSOR_RULES_DIR, CLAUDE_SKILLS_DIR, CLAUDE_RULES_DIR, CLAUDE_MD_PATH
    global SKILLS_DIR, TW_DIR, PERSONAL_SKILLS_DIR, TW_MODULE_SKILLS_DIR
    global JIRA_APIKEY_PATH, RH_OFFLINE_TOKEN_PATH, RH_OFFLINE_TOKEN_PLAIN_PATH

    cursor = cfg.get("cursor") or {}
    claude = cfg.get("claude") or {}

    CURSOR_SKILLS_DIR = expand_path(cursor.get("skills_dir") or DEFAULT_CONFIG["cursor"]["skills_dir"])
    CURSOR_RULES_DIR = expand_path(cursor.get("rules_dir") or DEFAULT_CONFIG["cursor"]["rules_dir"])
    CLAUDE_SKILLS_DIR = expand_path(claude.get("skills_dir") or DEFAULT_CONFIG["claude"]["skills_dir"])
    CLAUDE_RULES_DIR = expand_path(claude.get("rules_dir") or DEFAULT_CONFIG["claude"]["rules_dir"])
    claude_md = str(claude.get("claude_md_path") or "").strip()
    CLAUDE_MD_PATH = expand_path(claude_md) if claude_md else None

    SKILLS_DIR = CURSOR_SKILLS_DIR
    TW_DIR = expand_path(cfg["tailwind_dir"])
    JIRA_APIKEY_PATH = expand_path(cfg["jira_apikey_path"])
    RH_OFFLINE_TOKEN_PATH = expand_path(cfg["rh_offline_token_path"])
    RH_OFFLINE_TOKEN_PLAIN_PATH = expand_path(cfg["rh_offline_token_plain_path"])

    personal = str(cfg.get("personal_skills_dir") or "").strip()
    PERSONAL_SKILLS_DIR = expand_path(personal) if personal else None

    module = str(cfg.get("tailwind_module_skills_dir") or "").strip()
    if module:
        TW_MODULE_SKILLS_DIR = expand_path(module)
    else:
        auto = CURSOR_SKILLS_DIR / ".lola" / "modules" / "tailwind" / "skills"
        TW_MODULE_SKILLS_DIR = auto if auto.is_dir() else None


def discover_skill_ids(directory: Path | None) -> set[str]:
    """Skill folder names that contain SKILL.md (or skill.md)."""
    ids: set[str] = set()
    if directory is None or not directory.is_dir():
        return ids
    for child in directory.iterdir():
        if not child.is_dir() or child.name.startswith("."):
            continue
        if (child / "SKILL.md").is_file() or (child / "skill.md").is_file():
            ids.add(child.name)
    return ids


def build_origin_map(
    installed_ids: set[str],
    *,
    personal_ids: set[str],
    tailwind_ids: set[str],
) -> dict[str, str]:
    """Tag each installed skill as personal or tailwind.

    Prefer Lola Tailwind module membership when present; personal_skills_dir
    overrides (and is the fallback when Lola is absent).
    """
    have_lola = bool(tailwind_ids)
    have_personal = bool(personal_ids)
    out: dict[str, str] = {}
    for sid in installed_ids:
        if sid in personal_ids:
            out[sid] = "personal"
        elif sid in tailwind_ids:
            out[sid] = "tailwind"
        elif have_lola:
            out[sid] = "personal"
        elif have_personal:
            out[sid] = "tailwind"
        else:
            out[sid] = "tailwind"
    return out


AUTH_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\.jira-apikey|~/code/\.jira-apikey|\bjira-apikey\b", re.I), "~/code/.jira-apikey (Jira API token)"),
    (re.compile(r"\.jira-token|~/\.jira-token", re.I), "~/.jira-token (jira-cli)"),
    (re.compile(r"\.rh-offline-token|RH offline|Case Management", re.I), "~/code/.rh-offline-token / Case Management API"),
    (re.compile(r"SLACK_XOX[CD]|env\.sh.*[Ss]lack|~/\.config/tailwind/env\.sh", re.I), "~/.config/tailwind/env.sh (Slack session tokens)"),
    (re.compile(r"\.gdrive_token|gdoc_auth|gdoc-fetch/scripts", re.I), "gdoc-fetch OAuth (~/.cursor/skills/gdoc-fetch/scripts/.gdrive_token.json)"),
    (re.compile(r"application.default|application_default_credentials|\bADC\b", re.I), "Google ADC (~/.config/gcloud/application_default_credentials.json)"),
    (re.compile(r"~/\.config/gws|gws auth|GOOGLE_WORKSPACE_CLI", re.I), "gws CLI store (~/.config/gws/)"),
    (re.compile(r"GITLAB_PAT|gitlab\.cee|glab\b", re.I), "GitLab CEE access (SSH/PAT / glab)"),
    (re.compile(r"\bgh auth\b|\bgh\b.*GitHub", re.I), "GitHub CLI (gh)"),
]

TOOL_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bgws\b", re.I), "gws (Google Workspace CLI)"),
    (re.compile(r"\bjira-cli\b|\bjira\b(?!\s*project)", re.I), "Jira (API / jira-cli)"),
    (re.compile(r"\bglab\b", re.I), "glab"),
    (re.compile(r"\bgh\b", re.I), "gh"),
    (re.compile(r"\bgcloud\b", re.I), "gcloud"),
    (re.compile(r"Dataverse", re.I), "Dataverse"),
    (re.compile(r"Atlassian|Rovo", re.I), "Atlassian / Rovo"),
    (re.compile(r"Snowflake", re.I), "Snowflake"),
    (re.compile(r"Google Docs|Docs API|Drive API", re.I), "Google Docs / Drive API"),
    (re.compile(r"Gmail", re.I), "Gmail"),
    (re.compile(r"Google Calendar|Calendar API", re.I), "Google Calendar"),
    (re.compile(r"Slack", re.I), "Slack"),
]

MCP_FRIENDLY = {
    "atlassian": "Atlassian MCP",
    "jira": "Jira / Atlassian MCP",
    "dataverse": "Dataverse MCP",
    "dataverse-agent-mcp": "Dataverse MCP",
    "memory": "Memory MCP",
    "gws-cli": "gws-cli (CLI skills, not always listed as MCP)",
    "slack": "Slack MCP",
}


def parse_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    raw_fm, body = parts[1], parts[2].lstrip("\n")
    meta: dict = {}
    m = re.search(
        r"(?ms)^description:\s*[|>]-?\s*\n((?:[ \t]+.*\n?)*)",
        raw_fm,
    )
    if m:
        lines = [ln.strip() for ln in m.group(1).splitlines() if ln.strip()]
        meta["description"] = " ".join(lines)
    else:
        m = re.search(r'(?m)^description:\s*["\']?(.*?)["\']?\s*$', raw_fm)
        if m:
            meta["description"] = m.group(1).strip().strip("\"'")

    m = re.search(r"(?m)^name:\s*[\"']?([^\n\"']+)[\"']?\s*$", raw_fm)
    if m:
        meta["name"] = m.group(1).strip()

    m = re.search(r"(?ms)^allowed-tools:\s*(.+?)(?=\n[a-zA-Z][\w-]*:|\Z)", raw_fm)
    if m:
        meta["allowed-tools"] = re.sub(r"\s+", " ", m.group(1)).strip()

    meta_block = re.search(r"(?ms)^metadata:\s*\n((?:[ \t]+.+\n?)*)", raw_fm)
    if meta_block:
        md = {}
        for line in meta_block.group(1).splitlines():
            km = re.match(r"^\s+([\w-]+):\s*(.+)$", line)
            if km:
                md[km.group(1)] = km.group(2).strip().strip("\"'")
        meta["metadata"] = md

    return meta, body


def categorize(sid: str, meta: dict, origin: str) -> list[str]:
    """Map a skill into up to 2 of the 7 handbook categories."""
    md = meta.get("metadata") or {}
    domain = (md.get("domain") or "").lower()
    family = (md.get("skill-family") or "").lower()
    cats: list[str] = []

    def add(c: str) -> None:
        if c in CATEGORY_ORDER and c not in cats:
            cats.append(c)

    if family in ("jira", "rfe") or sid.startswith(("rfe-", "jira-", "tmm-jira")) or sid in (
        "jira-all-my-features",
        "feature-triage-report",
    ):
        add("Jira & RFE")

    if (
        family in ("roadmap", "strategy")
        or "roadmap" in sid
        or "productization" in sid
        or sid.startswith("rfe-strat")
    ):
        add("Roadmap & decisions")

    if domain == "pmm" or family == "messaging" or sid.startswith("pmm-messaging") or sid.startswith(
        "pmm-portfolio"
    ):
        add("Product marketing")

    if family in ("brand", "validation") or "brand" in sid or "quality-gate" in sid or "validator" in sid or "validation" in sid:
        add("Brand & quality")

    if (
        family in ("dataverse", "support")
        or "dataverse" in sid
        or "support-cases" in sid
        or sid in ("account-investigate", "partner-research", "customer-signal-intake", "synergy-assessment", "cross-bu-synthesis", "rh-synergy-engine", "official-find-cust-ref")
    ):
        add("Data & research")

    if family == "gws" or sid in DAILY_OPS_IDS:
        add("Daily ops")

    if (
        domain in ("domain0", "shared", "tmm")
        or family in ("program", "registry", "reporting")
        or sid.startswith(("domain0-", "tailwind-", "mr-check", "skill-architect", "context-setup", "knowledge-registry", "registry-", "redhat-slides", "redhat-training", "eol-comms"))
        or (origin == "personal" and sid not in DAILY_OPS_IDS and "Jira & RFE" not in cats)
    ):
        add("Platform & tools")

    if domain == "tmm" and "Platform & tools" not in cats:
        add("Platform & tools")

    if not cats:
        if origin == "personal":
            add("Platform & tools")
        elif domain == "pm":
            add("Jira & RFE")
        elif domain == "pmm":
            add("Product marketing")
        else:
            add("Platform & tools")

    # Prefer primary signal order; keep at most 2 for table density
    return [c for c in CATEGORY_ORDER if c in cats][:2]


def extract_mcp(meta: dict, full: str) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()

    def add(label: str) -> None:
        if label not in seen:
            seen.add(label)
            found.append(label)

    tools = meta.get("allowed-tools") or ""
    for tok in re.findall(r"mcp__([a-zA-Z0-9_-]+)__", tools + "\n" + full):
        add(MCP_FRIENDLY.get(tok.lower(), f"{tok} MCP"))
    if re.search(r"Dataverse MCP|dataverse-agent", full, re.I):
        add("Dataverse MCP")
    if re.search(r"Atlassian MCP|mcp\.atlassian|Atlassian-MCP", full, re.I):
        add("Atlassian MCP")
    if re.search(r"Memory Service MCP|memory\.sqlite", full, re.I):
        add("Memory MCP")
    if re.search(r"Slack MCP", full, re.I):
        add("Slack MCP")
    return found


def extract_labeled(patterns: list[tuple[re.Pattern[str], str]], text: str) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for pat, label in patterns:
        if pat.search(text) and label not in seen:
            seen.add(label)
            out.append(label)
    return out


def section_body(body: str, title_pat: str) -> str:
    m = re.search(
        rf"(?ims)^##+[ \t]+(?:{title_pat})[ \t]*\n(.*?)(?=^## |\Z)",
        body,
    )
    if not m:
        return ""
    return (m.group(1) or "").strip()


def build_detail_brief(name: str, description: str, body: str) -> str:
    chunks: list[str] = []
    when = section_body(body, r"When to use|When to Use")
    if when:
        lines = [ln for ln in when.splitlines() if ln.strip()][:12]
        chunks.append("### When to use\n" + "\n".join(lines))

    m = re.search(r"(?ms)^# .+\n+(.*?)(?=^## |\Z)", body)
    if m:
        opener = m.group(1).strip()
        paras = [p.strip() for p in re.split(r"\n\s*\n", opener) if p.strip()]
        keep = []
        for p in paras[:3]:
            if p.startswith("|") or p.startswith("```"):
                continue
            keep.append(p)
            if sum(len(x) for x in keep) > 600:
                break
        if keep:
            chunks.append("### Overview\n" + "\n\n".join(keep))

    if not chunks:
        chunks.append("### Overview\n" + (description or f"Skill `{name}`."))
    return "\n\n".join(chunks)


def one_line(text: str, limit: int = 220) -> str:
    t = re.sub(r"\s+", " ", text or "").strip()
    if len(t) <= limit:
        return t
    return t[: limit - 1].rstrip() + "…"


def skill_record(skill_dir: Path) -> dict | None:
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.is_file():
        alt = skill_dir / "skill.md"
        if not alt.is_file():
            return None
        skill_md = alt

    full = skill_md.read_text(encoding="utf-8", errors="replace")
    meta, body = parse_frontmatter(full)
    sid = skill_dir.name
    name = meta.get("name") or sid
    description = meta.get("description") or ""
    if not description:
        for line in body.splitlines():
            line = line.strip()
            if line and not line.startswith("#") and not line.startswith("|"):
                description = line
                break

    origin = ORIGIN_BY_ID.get(sid, "tailwind")
    categories = categorize(sid, meta, origin)
    mcp = extract_mcp(meta, full)
    auth = extract_labeled(AUTH_PATTERNS, full)
    tools = extract_labeled(TOOL_PATTERNS, full)

    for title in (r"Auth(?:\s|&| and ).*", r"Dependencies", r"Auth & API requirements"):
        sec = section_body(body, title)
        if sec:
            for bullet in re.findall(r"(?m)^[-*]\s+(.+)$", sec):
                label = one_line(bullet, 160)
                if label and label not in auth:
                    auth.append(label)

    return {
        "id": sid,
        "name": name,
        "origin": origin,
        "categories": categories,
        "summary": one_line(description),
        "detail_markdown": build_detail_brief(name, description, body),
        "dependencies": {"mcp": mcp, "auth": auth, "tools": tools},
        "full_markdown": full,
        "path": _display_path(skill_dir),
        "search_blob": " ".join(
            [
                sid,
                name,
                description,
                " ".join(categories),
                " ".join(mcp),
                " ".join(auth),
                " ".join(tools),
                origin,
            ]
        ).lower(),
    }


def _display_path(path: Path) -> str:
    try:
        return "~/" + str(path.relative_to(HOME))
    except ValueError:
        return str(path)


def _format_value(val: object, *, limit: int = 120) -> str:
    if val is None:
        return "null"
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, str):
        return one_line(val, limit)
    if isinstance(val, list):
        if not val:
            return "[]"
        if all(isinstance(x, (str, int, float, bool)) or x is None for x in val):
            joined = ", ".join(_format_value(x, limit=40) for x in val)
            return one_line(f"[{joined}]", limit)
        return one_line(json.dumps(val, ensure_ascii=False), limit)
    if isinstance(val, dict):
        return one_line(json.dumps(val, ensure_ascii=False), limit)
    return one_line(str(val), limit)


def _detail_value(val: object) -> str:
    if val is None:
        return "null"
    if isinstance(val, (dict, list)):
        return json.dumps(val, indent=2, ensure_ascii=False)
    if isinstance(val, bool):
        return "true" if val else "false"
    return str(val)


def _flatten_json(
    obj: object,
    prefix: str = "",
    *,
    source: str,
    path: str,
) -> list[dict]:
    rows: list[dict] = []
    if isinstance(obj, dict):
        if not obj and prefix:
            rows.append(
                {
                    "id": f"{source}:{prefix}",
                    "name": prefix,
                    "value": "{}",
                    "detail_value": "{}",
                    "path": path,
                    "source": source,
                    "kind": "json_key",
                    "search_blob": f"{prefix} {source} {path}".lower(),
                }
            )
            return rows
        for key, val in obj.items():
            key_path = f"{prefix}.{key}" if prefix else str(key)
            if isinstance(val, dict):
                rows.extend(_flatten_json(val, key_path, source=source, path=path))
            elif isinstance(val, list) and val and isinstance(val[0], dict):
                rows.append(
                    {
                        "id": f"{source}:{key_path}",
                        "name": key_path,
                        "value": _format_value(val),
                        "detail_value": _detail_value(val),
                        "path": path,
                        "source": source,
                        "kind": "json_key",
                        "search_blob": f"{key_path} {source} {path} {_format_value(val, limit=200)}".lower(),
                    }
                )
            else:
                rows.append(
                    {
                        "id": f"{source}:{key_path}",
                        "name": key_path,
                        "value": _format_value(val),
                        "detail_value": _detail_value(val),
                        "path": path,
                        "source": source,
                        "kind": "json_key",
                        "search_blob": f"{key_path} {source} {path} {_format_value(val, limit=200)}".lower(),
                    }
                )
    return rows


def _file_status_row(
    *,
    name: str,
    path: Path,
    source: str,
    secret: bool = False,
    value_fn=None,
) -> dict:
    disp = _display_path(path)
    exists = path.exists() or path.is_symlink()
    if not exists:
        value = "missing"
        detail = "File not found."
        kind = "missing"
    elif secret:
        try:
            raw = path.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            value = f"unreadable ({exc})"
            detail = value
            kind = "secret"
        else:
            if value_fn:
                value, detail = value_fn(raw, path)
            else:
                value = f"set ({len(raw.strip())} chars, mode {oct(path.stat().st_mode & 0o777)})"
                detail = (
                    f"Secret file present at {disp}. Contents are not shown in the handbook.\n"
                    f"Size: {len(raw)} bytes. Mode: {oct(path.stat().st_mode & 0o777)}."
                )
            kind = "secret"
    else:
        try:
            raw = path.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            value = f"unreadable ({exc})"
            detail = value
            kind = "file"
        else:
            if value_fn:
                value, detail = value_fn(raw, path)
            else:
                value = one_line(raw.replace("\n", " "), 120) if raw.strip() else "(empty)"
                detail = raw if len(raw) <= 20000 else raw[:20000] + "\n… (truncated)"
            kind = "file"
    return {
        "id": f"{source}:{name}",
        "name": name,
        "value": value,
        "detail_value": detail,
        "path": disp,
        "source": source,
        "kind": kind,
        "search_blob": f"{name} {source} {disp} {value}".lower(),
    }


def _rh_token_summary(raw: str, path: Path) -> tuple[str, str]:
    disp = _display_path(path)
    text = raw.strip()
    if text.startswith("{"):
        try:
            data = json.loads(text)
            expires = data.get("EXPIRES", "?")
            generated = data.get("GENERATED", "?")
            has_key = bool(data.get("KEY"))
            value = f"set · EXPIRES={expires} · KEY={'yes' if has_key else 'no'}"
            detail = (
                f"JSON offline-token wrapper at {disp}.\n"
                f"NAME: {data.get('NAME', '')}\n"
                f"GENERATED: {generated}\n"
                f"EXPIRES: {expires}\n"
                f"TTL_DAYS: {data.get('TTL_DAYS', '')}\n"
                f"REGENERATE: {data.get('REGENERATE', '')}\n"
                f"KEY: {'(present, redacted)' if has_key else '(missing)'}"
            )
            return value, detail
        except json.JSONDecodeError:
            pass
    return (
        f"set ({len(text)} chars, mode {oct(path.stat().st_mode & 0o777)})",
        f"Secret file present at {disp}. Contents are not shown.",
    )


def _env_sh_summary(raw: str, path: Path) -> tuple[str, str]:
    """List variable names only - never values."""
    names: list[str] = []
    for line in raw.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if s.startswith("export "):
            s = s[len("export ") :]
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=", s)
        if m:
            names.append(m.group(1))
    value = f"{len(names)} vars: " + ", ".join(names[:8])
    if len(names) > 8:
        value += ", …"
    detail = (
        f"Shell env file at {_display_path(path)}.\n"
        f"Variable names only (values redacted):\n"
        + ("\n".join(f"- {n}" for n in names) if names else "(no assignments found)")
    )
    return one_line(value, 120), detail


def collect_config() -> list[dict]:
    """Local Tailwind / Cursor / token configuration for the handbook Config tab."""
    rows: list[dict] = []

    tw_json = TW_DIR / "tailwind.json"
    if tw_json.is_file():
        try:
            data = json.loads(tw_json.read_text(encoding="utf-8"))
            rows.extend(
                _flatten_json(
                    data,
                    source="tailwind.json",
                    path=_display_path(tw_json),
                )
            )
        except (OSError, json.JSONDecodeError) as exc:
            rows.append(
                _file_status_row(
                    name="tailwind.json",
                    path=tw_json,
                    source="tailwind.json",
                    value_fn=lambda _r, _p: (f"parse error: {exc}", str(exc)),
                )
            )
    else:
        rows.append(
            _file_status_row(name="tailwind.json", path=tw_json, source="tailwind.json")
        )

    cfg_json = TW_DIR / "config.json"
    if cfg_json.is_file():
        try:
            data = json.loads(cfg_json.read_text(encoding="utf-8"))
            rows.extend(
                _flatten_json(
                    data,
                    source="config.json",
                    path=_display_path(cfg_json),
                )
            )
        except (OSError, json.JSONDecodeError) as exc:
            rows.append(
                {
                    "id": "config.json:error",
                    "name": "config.json",
                    "value": f"parse error: {exc}",
                    "detail_value": str(exc),
                    "path": _display_path(cfg_json),
                    "source": "config.json",
                    "kind": "file",
                    "search_blob": "config.json error",
                }
            )

    env_sh = TW_DIR / "env.sh"
    rows.append(
        _file_status_row(
            name="env.sh (var names)",
            path=env_sh,
            source="env.sh",
            secret=True,
            value_fn=_env_sh_summary,
        )
    )

    rows.append(
        _file_status_row(
            name="Jira API token",
            path=JIRA_APIKEY_PATH,
            source="secrets",
            secret=True,
        )
    )
    rows.append(
        _file_status_row(
            name="RH Case Management offline token",
            path=RH_OFFLINE_TOKEN_PATH,
            source="secrets",
            secret=True,
            value_fn=_rh_token_summary,
        )
    )
    rows.append(
        _file_status_row(
            name="RH offline token (plain KEY for Tailwind skill)",
            path=RH_OFFLINE_TOKEN_PLAIN_PATH,
            source="secrets",
            secret=True,
        )
    )

    support_link = SKILLS_DIR / "redhat-support-cases" / "red-hat-offline-token.txt"
    if support_link.exists() or support_link.is_symlink():
        target = ""
        try:
            if support_link.is_symlink():
                target = str(support_link.resolve())
                target_disp = _display_path(Path(target))
                value = f"symlink → {target_disp}"
                detail = f"Path: {_display_path(support_link)}\nResolves to: {target_disp}"
            else:
                value = "file present"
                detail = f"Path: {_display_path(support_link)}"
        except OSError as exc:
            value = f"error: {exc}"
            detail = value
        rows.append(
            {
                "id": "secrets:support-cases-token-link",
                "name": "redhat-support-cases token link",
                "value": value,
                "detail_value": detail,
                "path": _display_path(support_link),
                "source": "secrets",
                "kind": "secret",
                "search_blob": f"redhat-support-cases token {value}".lower(),
            }
        )
    else:
        rows.append(
            _file_status_row(
                name="redhat-support-cases token link",
                path=support_link,
                source="secrets",
            )
        )

    artifacts = TW_DIR / "artifacts"
    cache = TW_DIR / "jira-cache.json"
    if cache.is_file():
        try:
            payload = json.loads(cache.read_text(encoding="utf-8"))
            count = payload.get("count", len(payload.get("issues") or []))
            refreshed = payload.get("refreshed_at", "?")
            value = f"{count} RFEs · refreshed {refreshed}"
            detail = (
                f"Dedup cache at {_display_path(cache)}.\n"
                f"count: {count}\n"
                f"refreshed_at: {refreshed}\n"
                f"rfe_project_key: {payload.get('rfe_project_key')}\n"
                f"components: {len(payload.get('rfe_components') or [])}"
            )
        except (OSError, json.JSONDecodeError) as exc:
            value = f"error: {exc}"
            detail = str(exc)
        rows.append(
            {
                "id": "cache:jira-cache.json",
                "name": "RFE dedup cache",
                "value": value,
                "detail_value": detail,
                "path": _display_path(cache),
                "source": "cache",
                "kind": "file",
                "search_blob": f"jira-cache dedup {value}".lower(),
            }
        )
    else:
        rows.append(
            _file_status_row(name="RFE dedup cache", path=cache, source="cache")
        )

    rows.append(
        {
            "id": "paths:artifacts",
            "name": "artifacts_dir",
            "value": "present" if artifacts.is_dir() else "missing",
            "detail_value": f"Directory {_display_path(artifacts)} - {'exists' if artifacts.is_dir() else 'missing'}.",
            "path": _display_path(artifacts),
            "source": "paths",
            "kind": "file" if artifacts.is_dir() else "missing",
            "search_blob": "artifacts_dir tailwind",
        }
    )

    # Stable sort: source group then name
    source_order = {
        "tailwind.json": 0,
        "config.json": 1,
        "env.sh": 2,
        "secrets": 3,
        "cache": 4,
        "paths": 5,
    }
    rows.sort(key=lambda r: (source_order.get(r.get("source", ""), 99), r.get("name", "")))
    return rows


def rule_record(path: Path, *, rule_id: str | None = None, runtime: str = "cursor") -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")
    title = path.stem.replace("-", " ")
    description = ""
    body = text
    paths_scope = ""
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            fm, body = parts[1], parts[2].lstrip("\n")
            m = re.search(r"(?m)^description:\s*[\"']?(.*?)[\"']?\s*$", fm)
            if m:
                description = m.group(1).strip()
            m = re.search(r"(?m)^title:\s*[\"']?(.*?)[\"']?\s*$", fm)
            if m:
                title = m.group(1).strip()
            m = re.search(r"(?ms)^paths:\s*\n((?:[ \t]+.+\n?)*)", fm)
            if m:
                paths_scope = one_line(m.group(1), 160)
            else:
                m = re.search(r"(?m)^paths:\s*[\"']?(.*?)[\"']?\s*$", fm)
                if m:
                    paths_scope = m.group(1).strip()
    if not description:
        for line in body.splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                description = line
                break
    rid = rule_id or path.stem
    ext = path.suffix.lstrip(".") or "md"
    return {
        "id": rid,
        "name": title,
        "summary": one_line(description or path.name),
        "full_markdown": text,
        "path": _display_path(path),
        "runtime": runtime,
        "ext": ext,
        "paths": paths_scope,
        "search_blob": f"{rid} {title} {description} {paths_scope} {runtime}".lower(),
    }


def list_skill_dirs(skills_dir: Path) -> list[Path]:
    if not skills_dir.is_dir():
        return []
    return [
        child
        for child in sorted(skills_dir.iterdir(), key=lambda p: p.name.lower())
        if child.is_dir()
        and not child.name.startswith(".")
        and ((child / "SKILL.md").is_file() or (child / "skill.md").is_file())
    ]


def collect_runtime_skills(
    skills_dir: Path,
    *,
    runtime: str,
    personal_ids: set[str],
    tailwind_ids: set[str],
) -> tuple[list[dict], dict]:
    global ORIGIN_BY_ID
    installed_dirs = list_skill_dirs(skills_dir)
    installed_ids = {d.name for d in installed_dirs}
    ORIGIN_BY_ID = build_origin_map(
        installed_ids,
        personal_ids=personal_ids,
        tailwind_ids=tailwind_ids,
    )
    skills: list[dict] = []
    for child in installed_dirs:
        rec = skill_record(child)
        if rec:
            rec["runtime"] = runtime
            skills.append(rec)
    cat_counts = {c: 0 for c in CATEGORY_ORDER}
    for sk in skills:
        for c in sk["categories"]:
            cat_counts[c] = cat_counts.get(c, 0) + 1
    n_personal = sum(1 for s in skills if s["origin"] == "personal")
    n_tailwind = sum(1 for s in skills if s["origin"] == "tailwind")
    meta = {
        "skills_dir": str(skills_dir),
        "count": len(skills),
        "category_counts": cat_counts,
        "origin_discovery": {
            "personal_ids": len(personal_ids),
            "tailwind_ids": len(tailwind_ids),
            "personal": n_personal,
            "tailwind": n_tailwind,
        },
    }
    return skills, meta


def collect_cursor_rules(rules_dir: Path) -> list[dict]:
    rules: list[dict] = []
    if not rules_dir.is_dir():
        return rules
    for p in sorted(rules_dir.glob("*.mdc")):
        rules.append(rule_record(p, runtime="cursor"))
    return rules


def collect_claude_rules(rules_dir: Path, claude_md: Path | None) -> list[dict]:
    rules: list[dict] = []
    if claude_md is not None and claude_md.is_file():
        rules.append(
            rule_record(claude_md, rule_id="CLAUDE.md", runtime="claude")
        )
    if rules_dir.is_dir():
        for p in sorted(rules_dir.rglob("*.md")):
            if not p.is_file():
                continue
            try:
                rel = p.relative_to(rules_dir)
            except ValueError:
                rel = Path(p.name)
            rid = str(rel.with_suffix("")).replace("\\", "/")
            rules.append(rule_record(p, rule_id=rid, runtime="claude"))
    return rules


def main() -> None:
    cfg = load_config()
    apply_config(cfg)

    DIST.mkdir(parents=True, exist_ok=True)
    if not CURSOR_SKILLS_DIR.is_dir() and not CLAUDE_SKILLS_DIR.is_dir():
        raise SystemExit(
            f"No skills directories found (cursor={CURSOR_SKILLS_DIR}, claude={CLAUDE_SKILLS_DIR})"
        )

    personal_ids = discover_skill_ids(PERSONAL_SKILLS_DIR)
    tailwind_ids = discover_skill_ids(TW_MODULE_SKILLS_DIR)

    cursor_skills, cursor_meta = collect_runtime_skills(
        CURSOR_SKILLS_DIR,
        runtime="cursor",
        personal_ids=personal_ids,
        tailwind_ids=tailwind_ids,
    )
    cursor_rules = collect_cursor_rules(CURSOR_RULES_DIR)

    claude_skills, claude_meta = collect_runtime_skills(
        CLAUDE_SKILLS_DIR,
        runtime="claude",
        personal_ids=personal_ids,
        tailwind_ids=tailwind_ids,
    )
    claude_rules = collect_claude_rules(CLAUDE_RULES_DIR, CLAUDE_MD_PATH)

    config = collect_config()

    payload = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "personal_skills_dir": str(PERSONAL_SKILLS_DIR) if PERSONAL_SKILLS_DIR else None,
        "tailwind_module_skills_dir": (
            str(TW_MODULE_SKILLS_DIR) if TW_MODULE_SKILLS_DIR else None
        ),
        "tailwind_dir": str(TW_DIR),
        "categories": CATEGORY_ORDER,
        "cursor": {
            **cursor_meta,
            "rules_dir": str(CURSOR_RULES_DIR),
            "rules_count": len(cursor_rules),
            "skills": cursor_skills,
            "rules": cursor_rules,
        },
        "claude": {
            **claude_meta,
            "rules_dir": str(CLAUDE_RULES_DIR),
            "claude_md_path": str(CLAUDE_MD_PATH) if CLAUDE_MD_PATH else None,
            "rules_count": len(claude_rules),
            "skills": claude_skills,
            "rules": claude_rules,
        },
        "config": config,
        "config_count": len(config),
        # Flat aliases (Cursor) for older handbook UI / scripts
        "skills": cursor_skills,
        "rules": cursor_rules,
        "count": len(cursor_skills),
        "rules_count": len(cursor_rules),
        "skills_dir": str(CURSOR_SKILLS_DIR),
        "rules_dir": str(CURSOR_RULES_DIR),
        "category_counts": cursor_meta["category_counts"],
        "origin_discovery": cursor_meta["origin_discovery"],
    }
    out = DIST / "skills.json"
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        f"Wrote {out}\n"
        f"  cursor: {len(cursor_skills)} skills, {len(cursor_rules)} rules\n"
        f"  claude: {len(claude_skills)} skills, {len(claude_rules)} rules\n"
        f"  tailwind config: {len(config)} rows"
    )
    od = cursor_meta["origin_discovery"]
    print(
        f"  cursor origin: {od['personal']} personal, {od['tailwind']} tailwind"
        f" (lola={od['tailwind_ids']}, personal_dir={od['personal_ids']})"
    )


if __name__ == "__main__":
    main()
