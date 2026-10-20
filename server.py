#!/usr/bin/env python3
"""Local server for the handbook UI plus handbook.json read/write."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
HANDBOOK = ROOT / "handbook.json"
HANDBOOK_EXAMPLE = ROOT / "handbook.example.json"
HOST = "127.0.0.1"
PORT = int(__import__("os").environ.get("PORT", "8765"))

_SECRETISH = re.compile(
    r"(xox[baprs]-|ghp_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_\-]{20,}|"
    r"eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{10,}|BEGIN (RSA |OPENSSH )?PRIVATE KEY)",
    re.I,
)


def _load_text() -> tuple[str, Path, bool]:
    if HANDBOOK.is_file():
        return HANDBOOK.read_text(encoding="utf-8"), HANDBOOK, False
    if HANDBOOK_EXAMPLE.is_file():
        return HANDBOOK_EXAMPLE.read_text(encoding="utf-8"), HANDBOOK_EXAMPLE, True
    return "{}\n", HANDBOOK, True


def _regenerate() -> tuple[bool, str]:
    try:
        proc = subprocess.run(
            [sys.executable, str(ROOT / "generate.py")],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError as exc:
        return False, str(exc)
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "generate.py failed").strip()
        return False, err
    return True, (proc.stdout or "").strip()


def _expand_path(value: str) -> Path:
    return Path(value).expanduser()


def _check_path_value(
    label: str,
    value: object,
    *,
    kind: str,
    optional: bool,
    require_exists: bool = True,
) -> str | None:
    if value is None:
        value = ""
    if not isinstance(value, str):
        return f"{label} must be a string path."
    text = value.strip()
    if not text:
        if optional or not require_exists:
            return None
        return f"{label} is required."
    if _SECRETISH.search(text) or (
        len(text) > 200 and "/" not in text and "\\" not in text and not text.startswith("~")
    ):
        return f"{label} looks like a secret value. Put a filesystem path only."
    if not require_exists:
        return None
    resolved = _expand_path(text)
    if kind == "file":
        if not resolved.is_file():
            return f"{label}: file does not exist ({resolved})."
    else:
        if not resolved.is_dir():
            return f"{label}: folder does not exist ({resolved})."
    return None


def _config_path_checks(data: dict) -> list[tuple[str, object, str, bool]]:
    checks: list[tuple[str, object, str, bool]] = [
        ("personal_skills_dir", data.get("personal_skills_dir"), "dir", True),
        ("tailwind_dir", data.get("tailwind_dir"), "dir", False),
        ("tailwind_module_skills_dir", data.get("tailwind_module_skills_dir"), "dir", True),
        ("agents_skills_dir", data.get("agents_skills_dir"), "dir", True),
        ("jira_apikey_path", data.get("jira_apikey_path"), "file", True),
        ("rh_offline_token_path", data.get("rh_offline_token_path"), "file", True),
        ("rh_offline_token_plain_path", data.get("rh_offline_token_plain_path"), "file", True),
    ]
    cursor = data.get("cursor")
    if isinstance(cursor, dict):
        checks.extend(
            [
                ("cursor.skills_dir", cursor.get("skills_dir"), "dir", False),
                ("cursor.rules_dir", cursor.get("rules_dir"), "dir", False),
            ]
        )
    claude = data.get("claude")
    if isinstance(claude, dict):
        checks.extend(
            [
                ("claude.skills_dir", claude.get("skills_dir"), "dir", False),
                ("claude.rules_dir", claude.get("rules_dir"), "dir", True),
                ("claude.claude_md_path", claude.get("claude_md_path"), "file", True),
            ]
        )
    return checks


def _validate_config(data: object, dirty_fields: set[str] | None = None) -> str | None:
    if not isinstance(data, dict):
        return "handbook.json must be a JSON object."
    cursor = data.get("cursor")
    if cursor is not None and not isinstance(cursor, dict):
        return '"cursor" must be an object.'
    claude = data.get("claude")
    if claude is not None and not isinstance(claude, dict):
        return '"claude" must be an object.'

    for label, value, kind, optional in _config_path_checks(data):
        require_exists = dirty_fields is None or label in dirty_fields
        err = _check_path_value(
            label,
            value,
            kind=kind,
            optional=optional,
            require_exists=require_exists,
        )
        if err:
            return err
    return None


def _check_path_request(payload: object) -> dict:
    if not isinstance(payload, dict):
        return {"ok": False, "error": "Body must be a JSON object."}
    raw = payload.get("path")
    kind = str(payload.get("kind") or "dir").lower()
    optional = bool(payload.get("optional"))
    require_exists = bool(payload.get("require_exists", True))
    label = str(payload.get("label") or "Path")
    if kind not in ("dir", "file"):
        return {"ok": False, "error": 'kind must be "dir" or "file".'}
    if raw is not None and not isinstance(raw, str):
        return {"ok": False, "error": "path must be a string."}
    text = "" if raw is None else raw.strip()
    err = _check_path_value(
        label,
        text,
        kind=kind,
        optional=optional,
        require_exists=require_exists,
    )
    resolved = str(_expand_path(text)) if text else ""
    if err:
        return {
            "ok": False,
            "exists": False,
            "resolved": resolved,
            "error": err,
        }
    return {
        "ok": True,
        "exists": bool(text),
        "resolved": resolved,
        "error": None,
    }


class HandbookHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send_json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload, indent=2).encode("utf-8") + b"\n"
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return b""
        return self.rfile.read(length)

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/api/handbook-config":
            text, src, using_example = _load_text()
            self._send_json(
                HTTPStatus.OK,
                {
                    "path": str(HANDBOOK),
                    "source_path": str(src),
                    "using_example": using_example,
                    "text": text,
                },
            )
            return
        if path in ("", "/"):
            self.path = "/index.html"
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path not in ("/api/handbook-config", "/api/check-path"):
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        raw = self._read_body()
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                {"ok": False, "error": "Body must be UTF-8 text."},
            )
            return

        try:
            data = json.loads(text) if text.strip() else {}
        except json.JSONDecodeError as exc:
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                {"ok": False, "error": f"Invalid JSON: {exc}"},
            )
            return

        if path == "/api/check-path":
            self._send_json(HTTPStatus.OK, _check_path_request(data))
            return

        dirty_raw = data.pop("_dirty_fields", None) if isinstance(data, dict) else None
        dirty_fields: set[str] | None
        if dirty_raw is None:
            dirty_fields = None
        elif isinstance(dirty_raw, list) and all(isinstance(x, str) for x in dirty_raw):
            dirty_fields = set(dirty_raw)
        else:
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                {"ok": False, "error": '"_dirty_fields" must be an array of strings.'},
            )
            return

        err = _validate_config(data, dirty_fields=dirty_fields)
        if err:
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                {"ok": False, "error": err},
            )
            return

        # Normalize formatting for a stable on-disk file
        out = json.dumps(data, indent=2) + "\n"
        try:
            HANDBOOK.write_text(out, encoding="utf-8")
        except OSError as exc:
            self._send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"ok": False, "error": f"Could not write handbook.json: {exc}"},
            )
            return

        ok, detail = _regenerate()
        if not ok:
            self._send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {
                    "ok": False,
                    "error": f"Saved handbook.json but catalog rebuild failed: {detail}",
                    "saved": True,
                    "path": str(HANDBOOK),
                },
            )
            return

        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "saved": True,
                "path": str(HANDBOOK),
                "message": "Saved and rebuilt catalog.",
            },
        )


def main() -> None:
    if not DIST.is_dir():
        raise SystemExit(f"Missing dist/ at {DIST}. Run generate.py first.")
    httpd = ThreadingHTTPServer((HOST, PORT), HandbookHandler)
    print(f"Skills handbook: http://{HOST}:{PORT}/")
    print("Settings can edit handbook.json on this machine only (localhost).")
    print("Ctrl-C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
