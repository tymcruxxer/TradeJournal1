from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from .config import AgentConfig


def _is_packaged() -> bool:
    """
    Detect if running as a PyInstaller packaged executable.
    
    Returns:
        True if running as packaged .exe, False if running as Python script
    """
    return getattr(sys, "frozen", False) and hasattr(sys, "frozen")


def install_startup_task(config: AgentConfig, config_path: Path) -> subprocess.CompletedProcess:
    if os.name != "nt":
        raise RuntimeError("Windows startup tasks are only supported on Windows")

    command = subprocess.list2cmdline(build_agent_command(config_path, background=True))

    return subprocess.run(
        [
            "schtasks",
            "/Create",
            "/TN",
            config.startup_task_name,
            "/SC",
            "ONLOGON",
            "/TR",
            command,
            "/F",
        ],
        capture_output=True,
        text=True,
        check=False,
    )


def uninstall_startup_task(config: AgentConfig) -> subprocess.CompletedProcess:
    if os.name != "nt":
        raise RuntimeError("Windows startup tasks are only supported on Windows")

    return subprocess.run(
        ["schtasks", "/Delete", "/TN", config.startup_task_name, "/F"],
        capture_output=True,
        text=True,
        check=False,
    )


def startup_task_status(config: AgentConfig) -> subprocess.CompletedProcess:
    if os.name != "nt":
        raise RuntimeError("Windows startup tasks are only supported on Windows")

    return subprocess.run(
        ["schtasks", "/Query", "/TN", config.startup_task_name],
        capture_output=True,
        text=True,
        check=False,
    )


def _pythonw_executable() -> str:
    python_path = Path(sys.executable)
    pythonw_path = python_path.with_name("pythonw.exe")

    if pythonw_path.exists():
        return str(pythonw_path)

    return str(python_path)


def build_agent_command(config_path: Path, background: bool = False) -> list[str]:
    if _is_packaged():
        command = [sys.executable]
    else:
        python_executable = _pythonw_executable() if background else str(Path(sys.executable))
        main_script = Path(__file__).resolve().parents[1] / "main.py"
        command = [python_executable, str(main_script)]

    command.extend(["--config", str(config_path)])
    return command
