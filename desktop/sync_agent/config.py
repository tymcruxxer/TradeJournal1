from __future__ import annotations

import json
import os
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


def _get_app_home() -> Path:
    """
    Determine the application home directory.
    
    Returns:
        Path to app home directory. Creates it if it doesn't exist.
        
    Priority:
        1. Windows AppData/TradeJournal (packaged or user preference)
        2. ~/.config/tradejournal (Linux/macOS)
        3. Script directory (fallback for dev)
    """
    # Windows: Use AppData
    if sys.platform == "win32":
        appdata = os.getenv("APPDATA")
        if appdata:
            app_home = Path(appdata) / "TradeJournal"
            app_home.mkdir(parents=True, exist_ok=True)
            return app_home
    
    # Linux/macOS: Use ~/.config
    config_home = os.getenv("XDG_CONFIG_HOME")
    if config_home:
        app_home = Path(config_home) / "tradejournal"
    else:
        app_home = Path.home() / ".config" / "tradejournal"
    
    app_home.mkdir(parents=True, exist_ok=True)
    return app_home


def _get_default_config_path() -> Path:
    """
    Get default config path with backward compatibility.
    
    Priority:
        1. agent_config.json in script directory (dev mode)
        2. agent_config.json in app_home (packaged mode or user preference)
    """
    # Check if running as packaged executable
    is_packaged = getattr(sys, "frozen", False) and hasattr(sys, "frozen")
    
    script_dir = Path(__file__).resolve().parents[1]
    script_config = script_dir / "agent_config.json"
    
    # Dev mode: prefer script directory
    if not is_packaged:
        return script_config
    
    # Packaged mode: use app_home
    # Check if config exists in script directory first (migration support)
    if script_config.exists():
        return script_config
    
    return _get_app_home() / "agent_config.json"


DEFAULT_CONFIG_PATH = _get_default_config_path()


@dataclass
class AgentConfig:
    backend_url: str = "http://127.0.0.1:8000"
    api_key: str = ""
    account_id: str = ""
    account_name: str = ""
    quick_sync_interval_seconds: int = 300
    quick_sync_days: int = 7
    deep_sync_interval_hours: int = 12
    deep_sync_days: int = 730
    request_timeout_seconds: int = 30
    state_file: str = "sync_state.json"
    lock_file: str = "sync_agent.lock"
    log_file: str = "sync_agent.log"
    log_level: str = "INFO"
    startup_task_name: str = "TradeJournal MT5 Sync Agent"
    mt5_process_names: list[str] = field(
        default_factory=lambda: ["terminal64.exe", "terminal.exe"]
    )

    @property
    def upload_url(self) -> str:
        return f"{self.backend_url.rstrip('/')}/api/trades/upload"

    @property
    def deep_sync_interval_seconds(self) -> int:
        return self.deep_sync_interval_hours * 60 * 60


def config_requires_setup(config: AgentConfig) -> bool:
    return not config.backend_url.strip() or not _api_key_configured(config.api_key)


def _normalize_config(raw: dict[str, Any]) -> dict[str, Any]:
    known_fields = set(AgentConfig.__dataclass_fields__.keys())
    return {key: value for key, value in raw.items() if key in known_fields}


def load_config(path: Path = DEFAULT_CONFIG_PATH) -> AgentConfig:
    if not path.exists():
        save_default_config(path)
        raise FileNotFoundError(
            f"Created default config at {path}. Add your API key, then run again."
        )

    try:
        with path.open("r", encoding="utf-8-sig") as config_file:
            raw = json.load(config_file)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in config file {path}: {exc}") from exc

    return AgentConfig(**_normalize_config(raw))


def save_config(config: AgentConfig, path: Path = DEFAULT_CONFIG_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as config_file:
        json.dump(asdict(config), config_file, indent=2)
        config_file.write("\n")

    try:
        os.chmod(path, 0o600)
    except OSError:
        pass

    _restrict_config_permissions(path)


def save_default_config(path: Path = DEFAULT_CONFIG_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        return

    save_config(AgentConfig(), path)


def _api_key_configured(api_key: str) -> bool:
    value = api_key.strip()
    return bool(value) and value != "PASTE_API_KEY_HERE"


def _restrict_config_permissions(path: Path) -> None:
    if sys.platform != "win32":
        return

    username = os.getenv("USERNAME")
    if not username:
        return

    domain = os.getenv("USERDOMAIN")
    user = f"{domain}\\{username}" if domain else username

    try:
        subprocess.run(
            [
                "icacls",
                str(path),
                "/inheritance:r",
                "/grant:r",
                f"{user}:F",
                "SYSTEM:F",
            ],
            capture_output=True,
            text=True,
            check=False,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return
