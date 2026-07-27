"""
Authentication — Node.js Playwright-core login + session capture for Termux.

Mirrors the Windows-Copilot-API design: the browser is used ONLY to establish a
signed-in session (handling the AWS WAF / "verify you're human" check and the
email/password form). It does not chat. We then capture the bearer token from
`localStorage.userToken` plus the session cookies, and hand them to the
pure-HTTP client in `deepseek.client`.

A persistent Chromium profile means the human-check is a one-time thing: once
you've signed in, later runs reuse the profile and capture the token headlessly.

    from deepseek.auth import get_session
    session = get_session()          # logs in (visible) the first time, else headless
    print(session.token[:8], "...")
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, Optional

ROOT = Path(__file__).resolve().parent.parent
# Override with DEEPSEEK_PROFILE_DIR to reuse an existing signed-in Chrome profile.
DEFAULT_PROFILE_DIR = Path(os.getenv("DEEPSEEK_PROFILE_DIR", ROOT / "session" / "profile"))
DEFAULT_SESSION_FILE = ROOT / "session" / "session.json"

CHAT_URL = "https://chat.deepseek.com/"
SIGNIN_URL = "https://chat.deepseek.com/sign_in"

# Token is trusted for this long before we refresh it from the browser again.
SESSION_MAX_AGE = 6 * 60 * 60  # 6 hours


class LoginRequired(RuntimeError):
    """Raised when no usable session exists and interactive login is disallowed
    (e.g. inside the server, where we can't pop open a browser mid-request).
    The message tells the user how to log in."""

    DEFAULT = (
        "No DeepSeek session found. Log in first by running:\n"
        "    python -m deepseek.auth\n"
        "This opens a browser once so you can sign in and clear the human-check; "
        "afterwards the server reuses the saved session automatically."
    )

    def __init__(self, message: str = DEFAULT):
        super().__init__(message)


@dataclass
class Session:
    """A captured signed-in DeepSeek session."""

    token: str
    cookies: Dict[str, str]
    user_agent: str
    captured_at: float

    @property
    def age(self) -> float:
        return time.time() - self.captured_at

    def save(self, path: Path = DEFAULT_SESSION_FILE) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(asdict(self), indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: Path = DEFAULT_SESSION_FILE) -> Optional["Session"]:
        if not path.exists():
            return None
        try:
            return cls(**json.loads(path.read_text(encoding="utf-8")))
        except Exception:
            return None


def _run_node_auth(
    profile_dir: Path,
    headless: bool = False,
    assume_logged_out: bool = False,
    timeout: int = 300,
) -> Optional[Session]:
    profile_dir.mkdir(parents=True, exist_ok=True)
    helper_script = Path(__file__).resolve().parent / "auth_helper.js"

    cmd = [
        "node",
        str(helper_script),
        "--profile", str(profile_dir),
        "--timeout", str(timeout),
    ]
    if headless:
        cmd.append("--headless")
    if assume_logged_out:
        cmd.append("--assume-logged-out")

    env = os.environ.copy()
    if "CHROMIUM_PATH" not in env:
        env["CHROMIUM_PATH"] = "/data/data/com.termux/files/usr/bin/chromium-browser"
    if "PLAYWRIGHT_BROWSERS_PATH" not in env:
        env["PLAYWRIGHT_BROWSERS_PATH"] = "0"

    res = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if res.returncode != 0:
        if res.stderr:
            print(res.stderr.strip(), file=sys.stderr)
        return None

    stdout = res.stdout.strip()
    if not stdout:
        return None

    try:
        data = json.loads(stdout)
        return Session(
            token=data["token"],
            cookies=data["cookies"],
            user_agent=data["user_agent"],
            captured_at=float(data["captured_at"]),
        )
    except Exception as e:
        print(f"[auth] Failed to parse session JSON from Node helper: {e}", file=sys.stderr)
        return None


def login(
    profile_dir: Path = DEFAULT_PROFILE_DIR,
    headless: bool = False,
    assume_logged_out: bool = False,
) -> Session:
    """Interactive login. Opens a browser window via Node.js playwright-core and waits
    for you to sign in by hand (and clear the AWS WAF human-check); once a token appears it
    captures and saves the session."""
    session = _run_node_auth(
        profile_dir=profile_dir,
        headless=headless,
        assume_logged_out=assume_logged_out,
        timeout=300,
    )
    if session is None:
        raise RuntimeError("Login timed out or failed — no token captured.")
    session.save()
    return session


def _headless_refresh(profile_dir: Path) -> Optional[Session]:
    """Try to capture a token headlessly from the persistent profile via Node.js playwright-core."""
    session = _run_node_auth(
        profile_dir=profile_dir,
        headless=True,
        assume_logged_out=False,
        timeout=20,
    )
    if session is not None:
        session.save()
    return session


def get_session(
    profile_dir: Path = DEFAULT_PROFILE_DIR,
    session_file: Path = DEFAULT_SESSION_FILE,
    max_age: int = SESSION_MAX_AGE,
    allow_interactive: bool = True,
) -> Session:
    """Return a usable session: cached file if fresh, else a headless refresh
    from the browser profile.

    If neither works and `allow_interactive` is True, open a browser window for
    manual sign-in. If it's False (the server's case — we can't pop a browser
    mid-request), raise `LoginRequired` telling the user to run the login step."""
    cached = Session.load(session_file)
    if cached and cached.age < max_age:
        return cached

    # Try a headless refresh from the (presumably logged-in) persistent profile.
    session = _headless_refresh(profile_dir)
    if session is not None:
        return session

    if not allow_interactive:
        raise LoginRequired()

    # Not logged in yet — open a browser window so the user can sign in (and
    # clear the human-check) by hand.
    print("[auth] No valid session found — opening a browser window to log in...")
    return login(profile_dir=profile_dir, assume_logged_out=True)


if __name__ == "__main__":
    s = login()
    print(f"[auth] captured token {s.token[:10]}... ({len(s.cookies)} cookies)")
