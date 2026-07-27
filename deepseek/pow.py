"""
Proof-of-work solver for DeepSeek's chat completion endpoint.

DeepSeek gates `POST /api/v0/chat/completion` behind a proof-of-work header
(`x-ds-pow-response`). The PoW algorithm ("DeepSeekHashV1") is shipped as a
WebAssembly module loaded from DeepSeek's CDN.

On Termux, this helper invokes Node.js (`deepseek/pow_helper.cjs`) using Node's
built-in WebAssembly engine to execute `sha3_wasm_bg.wasm` without requiring
the Python `wasmtime` native module.

Public API:
    solver = DeepSeekPow()
    header = solver.make_header(challenge_dict)  # -> base64 x-ds-pow-response value
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

WASM_PATH = Path(__file__).resolve().parent / "sha3_wasm_bg.wasm"
HELPER_PATH = Path(__file__).resolve().parent / "pow_helper.cjs"


class DeepSeekPow:
    def __init__(self, wasm_path: Path = WASM_PATH, helper_path: Path = HELPER_PATH):
        self._helper_path = helper_path

    def make_header(self, challenge: dict) -> str:
        """Build the base64 `x-ds-pow-response` header value from a challenge dict."""
        res = subprocess.run(
            ["node", str(self._helper_path)],
            input=json.dumps(challenge),
            capture_output=True,
            text=True,
        )
        if res.returncode != 0:
            err = res.stderr.strip() if res.stderr else "Unknown error"
            raise RuntimeError(f"PoW solver failed: {err}")
        header = res.stdout.strip()
        if not header:
            raise RuntimeError("PoW solver returned empty header")
        return header
