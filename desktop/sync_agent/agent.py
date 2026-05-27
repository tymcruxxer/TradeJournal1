from __future__ import annotations

import argparse
import logging
import sys
import time
from logging.handlers import RotatingFileHandler
from pathlib import Path

from .branding import APP_NAME, WINDOW_TITLE
from .config import (
    DEFAULT_CONFIG_PATH,
    AgentConfig,
    config_requires_setup,
    load_config,
    _get_app_home,
)
from .lock import SingleInstanceLock
from .mt5_reader import fetch_closed_trades
from .process import is_mt5_running
from .startup import install_startup_task, startup_task_status, uninstall_startup_task
from .state import SyncState
from .uploader import upload_trades


LOGGER = logging.getLogger("tradejournal-sync-agent")


def _is_packaged() -> bool:
    """
    Detect if running as a PyInstaller packaged executable.
    
    Returns:
        True if running as packaged .exe, False if running as Python script
    """
    return getattr(sys, "frozen", False) and hasattr(sys, "frozen")


class SyncAgent:
    def __init__(self, config: AgentConfig, config_path: Path):
        self.config = config
        self.config_path = config_path
        self.state_path = self._resolve_state_path(config.state_file)
        self.lock_path = self._resolve_state_path(config.lock_file)
        self.state = SyncState.load(self.state_path)

    def run_forever(self) -> None:
        LOGGER.info("Starting TradeJournal MT5 sync agent")

        while True:
            try:
                self.sync_once()
            except Exception:
                LOGGER.exception("Sync cycle failed")

            time.sleep(self.config.quick_sync_interval_seconds)

    def sync_once(self) -> dict:
        if not is_mt5_running(self.config.mt5_process_names):
            LOGGER.info("MT5 terminal is not running; skipping sync")
            return {"mode": "skipped", "reason": "mt5_not_running"}

        deep_sync = self.state.due_for_deep_sync(
            self.config.deep_sync_interval_seconds
        )
        days = self.config.deep_sync_days if deep_sync else self.config.quick_sync_days
        mode = "deep" if deep_sync else "quick"

        LOGGER.info("Running %s sync for the last %s days", mode, days)
        trades = fetch_closed_trades(days)
        unsynced_trades = self.state.filter_unsynced(trades)

        if not unsynced_trades:
            if deep_sync:
                self.state.mark_deep_sync()
                self.state.save(self.state_path)

            LOGGER.info("No new trades found")
            return {
                "mode": mode,
                "fetched": len(trades),
                "uploaded": 0,
                "skipped_local": len(trades),
            }

        upload_result = upload_trades(self.config, unsynced_trades)
        accepted = int(upload_result.get("saved") or 0) + int(upload_result.get("skipped") or 0)
        if accepted < len(unsynced_trades):
            raise RuntimeError(
                f"Backend accepted {accepted} of {len(unsynced_trades)} trades; leaving state unchanged for retry"
            )

        self.state.mark_synced([int(trade["ticket"]) for trade in unsynced_trades])

        if deep_sync:
            self.state.mark_deep_sync()

        self.state.save(self.state_path)

        LOGGER.info(
            "Uploaded %s trades; backend saved=%s skipped=%s",
            len(unsynced_trades),
            upload_result.get("saved"),
            upload_result.get("skipped"),
        )

        return {
            "mode": mode,
            "fetched": len(trades),
            "uploaded": len(unsynced_trades),
            "backend": upload_result,
        }

    def _resolve_state_path(self, state_file: str) -> Path:
        state_path = Path(state_file)

        if state_path.is_absolute():
            return state_path

        # If packaged, use app_home; otherwise use config directory (dev mode)
        if _is_packaged():
            return _get_app_home() / state_path
        
        return self.config_path.parent / state_path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="TradeJournal local MT5 sync agent")
    parser.add_argument(
        "--config",
        default=str(DEFAULT_CONFIG_PATH),
        help="Path to the agent JSON config file",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run one sync cycle and exit",
    )
    parser.add_argument(
        "--install-startup",
        action="store_true",
        help="Install the agent as a Windows logon scheduled task",
    )
    parser.add_argument(
        "--uninstall-startup",
        action="store_true",
        help="Remove the Windows logon scheduled task",
    )
    parser.add_argument(
        "--startup-status",
        action="store_true",
        help="Show the Windows scheduled task status",
    )
    parser.add_argument(
        "--setup",
        action="store_true",
        help="Open the desktop setup wizard",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show the status window with sync health information",
    )
    return parser


def configure_logging(config: AgentConfig, config_path: Path, include_console: bool = True) -> None:
    level = getattr(logging, config.log_level.upper(), logging.INFO)
    log_path = Path(config.log_file)

    if not log_path.is_absolute():
        # If packaged, use app_home; otherwise use config directory (dev mode)
        if _is_packaged():
            log_path = _get_app_home() / log_path
        else:
            log_path = config_path.parent / log_path

    log_path.parent.mkdir(parents=True, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    for handler in root_logger.handlers:
        handler.close()

    root_logger.handlers.clear()

    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s: %(message)s"
    )

    file_handler = RotatingFileHandler(
        log_path,
        maxBytes=1_000_000,
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)

    if include_console:
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)


def _log_task_result(action: str, returncode: int, stdout: str, stderr: str) -> None:
    if returncode == 0:
        LOGGER.info("%s succeeded: %s", action, stdout.strip())
    else:
        LOGGER.error("%s failed: %s %s", action, stdout.strip(), stderr.strip())


def _show_dialog(kind: str, message: str) -> None:
    if not _is_packaged():
        return

    try:
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        root.title(WINDOW_TITLE)

        if kind == "error":
            messagebox.showerror(APP_NAME, message, parent=root)
        elif kind == "warning":
            messagebox.showwarning(APP_NAME, message, parent=root)
        else:
            messagebox.showinfo(APP_NAME, message, parent=root)

        root.destroy()
    except Exception:
        LOGGER.info("%s", message)


def _open_setup_wizard(config_path: Path, initial_message: str | None = None) -> bool:
    from .setup_ui import run_setup_wizard

    return run_setup_wizard(config_path, initial_message)


def _load_runtime_config(
    config_path: Path,
    force_setup: bool = False,
    allow_ui: bool = False,
) -> tuple[AgentConfig, bool]:
    """
    Load runtime config, showing setup UI if needed.
    
    Returns:
        Tuple of (config, setup_was_completed)
        setup_was_completed is True if setup wizard was just shown and completed
    """
    setup_was_completed = False

    if force_setup and not _open_setup_wizard(config_path):
        raise SystemExit(1)

    try:
        config = load_config(config_path)
    except (FileNotFoundError, ValueError) as exc:
        if allow_ui or force_setup:
            if not _open_setup_wizard(config_path, str(exc)):
                raise SystemExit(1) from exc
            setup_was_completed = True
            config = load_config(config_path)
        else:
            LOGGER.error("%s", exc)
            raise SystemExit(1) from exc

    if config_requires_setup(config):
        message = "Finish setup by entering your backend URL and TradeJournal API key."
        if allow_ui or force_setup:
            if not _open_setup_wizard(config_path, message):
                raise SystemExit(1)
            setup_was_completed = True
            config = load_config(config_path)
        else:
            LOGGER.error("Agent config is missing a backend URL or API key")
            raise SystemExit(1)

    return config, setup_was_completed


def _load_task_config(config_path: Path) -> AgentConfig:
    try:
        return load_config(config_path)
    except Exception:
        return AgentConfig()


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    args = build_parser().parse_args()
    config_path = Path(args.config).resolve()
    allow_setup_ui = _is_packaged() and not (
        args.once
        or args.install_startup
        or args.uninstall_startup
        or args.startup_status
        or args.status
    )

    if args.status:
        from .status_window import show_status_window
        try:
            show_status_window(config_path)
        except Exception as exc:
            LOGGER.exception("Failed to show status window: %s", exc)
            if _is_packaged():
                _show_dialog("error", f"Could not display status window: {exc}")
        return

    if args.uninstall_startup or args.startup_status:
        config = _load_task_config(config_path)
        configure_logging(config, config_path, include_console=not _is_packaged())

        if args.uninstall_startup:
            result = uninstall_startup_task(config)
            _log_task_result(
                "Uninstall startup task",
                result.returncode,
                result.stdout,
                result.stderr,
            )
            if _is_packaged():
                _show_dialog(
                    "info" if result.returncode == 0 else "error",
                    result.stdout.strip() or result.stderr.strip() or "Startup task command completed.",
                )
            raise SystemExit(result.returncode)

        result = startup_task_status(config)
        _log_task_result(
            "Startup task status",
            result.returncode,
            result.stdout,
            result.stderr,
        )
        if _is_packaged():
            _show_dialog(
                "info" if result.returncode == 0 else "warning",
                result.stdout.strip() or result.stderr.strip() or "Startup task status is unavailable.",
            )
        raise SystemExit(result.returncode)

    config, setup_was_completed = _load_runtime_config(
        config_path,
        force_setup=args.setup,
        allow_ui=allow_setup_ui or args.setup,
    )
    configure_logging(config, config_path, include_console=not _is_packaged())
    
    LOGGER.info("Configuration loaded successfully. Backend URL: %s, API Key configured: %s", 
                config.backend_url, bool(config.api_key.strip()))

    if args.install_startup:
        result = install_startup_task(config, config_path)
        _log_task_result(
            "Install startup task",
            result.returncode,
            result.stdout,
            result.stderr,
        )
        if _is_packaged():
            _show_dialog(
                "info" if result.returncode == 0 else "error",
                result.stdout.strip() or result.stderr.strip() or "Startup task command completed.",
            )
        raise SystemExit(result.returncode)

    # If setup was just completed on first run, exit gracefully
    # The background sync agent will be launched by the Windows startup task
    if setup_was_completed and not args.once and _is_packaged():
        LOGGER.info("Setup completed successfully. Agent will launch in the background via Windows startup task.")
        return

    agent = SyncAgent(config, config_path)

    lock = SingleInstanceLock(agent.lock_path)

    if not lock.acquire():
        LOGGER.warning("Another sync agent instance is already running; exiting")
        if _is_packaged() and not args.once:
            _show_dialog("info", "TradeJournal Sync Agent is already running in the background.")
        return

    try:
        if args.once:
            try:
                result = agent.sync_once()
            except Exception as exc:
                LOGGER.error("One-shot sync failed: %s", exc)
                if _is_packaged():
                    _show_dialog("error", f"TradeJournal Sync Agent could not complete a sync.\n\n{exc}")
                raise SystemExit(1) from exc

            LOGGER.info("One-shot sync result: %s", result)
            return

        agent.run_forever()
    finally:
        lock.release()

    if args.install_startup:
        result = install_startup_task(config, config_path)
        _log_task_result(
            "Install startup task",
            result.returncode,
            result.stdout,
            result.stderr,
        )
        if _is_packaged():
            _show_dialog(
                "info" if result.returncode == 0 else "error",
                result.stdout.strip() or result.stderr.strip() or "Startup task command completed.",
            )
        raise SystemExit(result.returncode)

    agent = SyncAgent(config, config_path)

    lock = SingleInstanceLock(agent.lock_path)

    if not lock.acquire():
        LOGGER.warning("Another sync agent instance is already running; exiting")
        if _is_packaged() and not args.once:
            _show_dialog("info", "TradeJournal Sync Agent is already running in the background.")
        return

    try:
        if args.once:
            try:
                result = agent.sync_once()
            except Exception as exc:
                LOGGER.error("One-shot sync failed: %s", exc)
                if _is_packaged():
                    _show_dialog("error", f"TradeJournal Sync Agent could not complete a sync.\n\n{exc}")
                raise SystemExit(1) from exc

            LOGGER.info("One-shot sync result: %s", result)
            return

        agent.run_forever()
    finally:
        lock.release()


if __name__ == "__main__":
    main()
