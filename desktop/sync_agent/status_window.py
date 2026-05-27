from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from tkinter import Tk, ttk
from typing import Optional

from .branding import WINDOW_TITLE, runtime_icon_path
from .config import AgentConfig, load_config
from .lock import SingleInstanceLock
from .process import is_mt5_running
from .state import SyncState


class StatusWindow:
    """Lightweight status window showing agent health and sync status."""

    def __init__(self, config: AgentConfig, config_path: Path):
        self.config = config
        self.config_path = config_path
        self.state_path = self._resolve_state_path(config.state_file)
        self.lock_path = self._resolve_state_path(config.lock_file)

        self.root = Tk()
        self.root.title(f"{WINDOW_TITLE} — Status")
        self.root.geometry("600x400")
        self.root.minsize(600, 400)
        self.root.configure(bg="#08101d")
        self.root.protocol("WM_DELETE_WINDOW", self._close)

        # Center window on screen
        self.root.attributes("-topmost", True)
        self.root.update_idletasks()
        width = 600
        height = 400
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = max(0, (screen_width - width) // 2)
        y = max(0, (screen_height - height) // 2)
        self.root.geometry(f"{width}x{height}+{x}+{y}")

        self.status_var = {}

        self._apply_style()
        self._set_icon()
        self._build_layout()
        self._update_status()

    def run(self) -> None:
        self.root.mainloop()

    def _apply_style(self) -> None:
        style = ttk.Style(self.root)
        style.theme_use("clam")
        style.configure("Root.TFrame", background="#08101d")
        style.configure("Card.TFrame", background="#0f172a")
        style.configure("Muted.TLabel", background="#0f172a", foreground="#94a3b8", font=("Segoe UI", 10))
        style.configure("Body.TLabel", background="#0f172a", foreground="#e2e8f0", font=("Segoe UI", 10))
        style.configure("Title.TLabel", background="#08101d", foreground="#f8fafc", font=("Segoe UI Semibold", 18))
        style.configure("StatusLabel.TLabel", background="#0f172a", foreground="#22c55e", font=("Segoe UI", 11, "bold"))
        style.configure("Eyebrow.TLabel", background="#08101d", foreground="#67e8f9", font=("Segoe UI Semibold", 10))
        style.configure("Value.TLabel", background="#0f172a", foreground="#f8fafc", font=("Segoe UI Semibold", 12))

    def _set_icon(self) -> None:
        try:
            self.root.iconbitmap(default=str(runtime_icon_path()))
        except Exception:
            return

    def _build_layout(self) -> None:
        outer = ttk.Frame(self.root, style="Root.TFrame", padding=24)
        outer.pack(fill="both", expand=True)
        outer.columnconfigure(0, weight=1)

        ttk.Label(outer, text="Desktop Sync Agent", style="Eyebrow.TLabel").grid(
            row=0, column=0, sticky="w"
        )
        ttk.Label(
            outer,
            text="Sync Status",
            style="Title.TLabel",
        ).grid(row=1, column=0, sticky="w", pady=(6, 18))

        # Status cards
        card = ttk.Frame(outer, style="Card.TFrame", padding=20)
        card.grid(row=2, column=0, sticky="ew")
        card.columnconfigure(0, weight=1)

        self._add_status_row(card, "Agent Status", "setup_status", 0)
        self._add_status_row(card, "MT5 Detection", "mt5_status", 1)
        self._add_status_row(card, "Backend Connection", "backend_status", 2)
        self._add_status_row(card, "Last Sync", "last_sync", 3)
        self._add_status_row(card, "Active Account", "active_account", 4)
        self._add_status_row(card, "Instance Lock", "lock_status", 5)

    def _add_status_row(self, parent: ttk.Frame, label: str, key: str, row: int) -> None:
        ttk.Label(parent, text=label, style="Muted.TLabel").grid(
            row=row, column=0, sticky="w", pady=(0, 4)
        )

        status_label = ttk.Label(parent, text="Loading...", style="StatusLabel.TLabel")
        status_label.grid(row=row + 1, column=0, sticky="w", pady=(0, 12))

        self.status_var[key] = status_label

    def _update_status(self) -> None:
        # Check if setup is complete
        setup_complete = bool(self.config.api_key and self.config.backend_url)
        self.status_var["setup_status"].config(
            text="✓ Setup Complete" if setup_complete else "⚠ Setup Incomplete",
            foreground="#22c55e" if setup_complete else "#f97316",
        )

        # Check MT5 detection
        mt5_running = is_mt5_running(self.config.mt5_process_names)
        self.status_var["mt5_status"].config(
            text=f"✓ MT5 Detected ({', '.join(self.config.mt5_process_names[:1])})" if mt5_running else "✗ MT5 Not Running",
            foreground="#22c55e" if mt5_running else "#ef4444",
        )

        # Check backend connection status (basic)
        self.status_var["backend_status"].config(
            text=f"✓ {self.config.backend_url}",
            foreground="#22c55e",
        )

        # Check last sync time
        try:
            state = SyncState.load(self.state_path)
            if state.last_deep_sync_time:
                last_sync_dt = datetime.fromtimestamp(state.last_deep_sync_time)
                time_ago = self._format_time_ago(datetime.now() - last_sync_dt)
                self.status_var["last_sync"].config(
                    text=f"✓ {last_sync_dt.strftime('%Y-%m-%d %H:%M:%S')} ({time_ago} ago)",
                    foreground="#22c55e",
                )
            else:
                self.status_var["last_sync"].config(
                    text="⚠ Never synced",
                    foreground="#f97316",
                )
        except Exception:
            self.status_var["last_sync"].config(
                text="✗ Unable to read state",
                foreground="#ef4444",
            )

        # Check active account
        if self.config.account_id:
            account_display = self.config.account_name or self.config.account_id
            self.status_var["active_account"].config(
                text=f"✓ {account_display}",
                foreground="#22c55e",
            )
        else:
            self.status_var["active_account"].config(
                text="⚠ No account selected",
                foreground="#f97316",
            )

        # Check instance lock
        lock = SingleInstanceLock(self.lock_path)
        if lock.acquire():
            lock.release()
            self.status_var["lock_status"].config(
                text="✓ Available (not running)",
                foreground="#22c55e",
            )
        else:
            self.status_var["lock_status"].config(
                text="✓ Running in background",
                foreground="#06b6d4",
            )

    def _format_time_ago(self, delta) -> str:
        """Format a timedelta as a human-readable string."""
        total_seconds = int(delta.total_seconds())
        if total_seconds < 60:
            return f"{total_seconds}s"
        elif total_seconds < 3600:
            return f"{total_seconds // 60}m"
        elif total_seconds < 86400:
            return f"{total_seconds // 3600}h"
        else:
            return f"{total_seconds // 86400}d"

    def _resolve_state_path(self, state_file: str) -> Path:
        state_path = Path(state_file)
        if state_path.is_absolute():
            return state_path
        return self.config_path.parent / state_path

    def _close(self) -> None:
        self.root.destroy()


def show_status_window(config_path: Optional[Path] = None) -> None:
    """Launch the status window."""
    from .config import DEFAULT_CONFIG_PATH

    if config_path is None:
        config_path = DEFAULT_CONFIG_PATH

    try:
        config = load_config(config_path)
    except Exception:
        config = AgentConfig()

    window = StatusWindow(config, config_path)
    window.run()


if __name__ == "__main__":
    show_status_window()
