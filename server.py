#!/usr/bin/env python3
"""Local server for the handbook UI plus handbook.json read/write."""

from __future__ import annotations

import json
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
        if path != "/api/handbook-config":
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
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                {"ok": False, "error": f"Invalid JSON: {exc}"},
            )
            return

        if not isinstance(data, dict):
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                {"ok": False, "error": "handbook.json must be a JSON object."},
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
