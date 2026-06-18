from __future__ import annotations

import json
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .config import AgentConfig


MAX_UPLOAD_ATTEMPTS = 3
RETRYABLE_HTTP_STATUS = {500, 502, 503, 504}


def upload_trades(config: AgentConfig, trades: list[dict]) -> dict:
    if not trades:
        return {"message": "No trades to upload", "saved": 0, "skipped": 0}

    if not config.api_key or config.api_key == "PASTE_API_KEY_HERE":
        raise RuntimeError("Missing API key in agent config")

    payload = json.dumps(trades).encode("utf-8")
    request = Request(
        config.upload_url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-API-Key": config.api_key,
        },
    )

    for attempt in range(1, MAX_UPLOAD_ATTEMPTS + 1):
        try:
            with urlopen(request, timeout=config.request_timeout_seconds) as response:
                response_body = response.read().decode("utf-8")
            break
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            if exc.code not in RETRYABLE_HTTP_STATUS or attempt == MAX_UPLOAD_ATTEMPTS:
                raise RuntimeError(f"Upload failed with HTTP {exc.code}: {detail}") from exc
        except URLError as exc:
            if attempt == MAX_UPLOAD_ATTEMPTS:
                raise RuntimeError(f"Upload failed: {exc.reason}") from exc

        time.sleep(min(2 ** attempt, 10))
    else:
        raise RuntimeError("Upload failed after retry attempts")

    return json.loads(response_body) if response_body else {}


def send_heartbeat(config: AgentConfig, account_info: dict | None = None, status: str = "online") -> dict:
    if not config.api_key or config.api_key == "PASTE_API_KEY_HERE":
        raise RuntimeError("Missing API key in agent config")

    account_info = account_info or {}
    payload = {
        "account_id": account_info.get("login") or account_info.get("account_id") or config.account_id,
        "account_name": account_info.get("name") or account_info.get("account_name") or config.account_name,
        "broker": account_info.get("broker"),
        "server": account_info.get("server"),
        "mt5_connected": bool(account_info.get("connected")),
        "status": status,
    }

    request = Request(
        f"{config.backend_url.rstrip('/')}/api/trades/agent-heartbeat",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-API-Key": config.api_key,
        },
    )

    with urlopen(request, timeout=config.request_timeout_seconds) as response:
        response_body = response.read().decode("utf-8")

    return json.loads(response_body) if response_body else {}
