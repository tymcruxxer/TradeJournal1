from __future__ import annotations

from datetime import datetime
from pathlib import Path
from tkinter import Tk, ttk
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .branding import WINDOW_TITLE, runtime_icon_path
from .config import AgentConfig, load_config
from .lock import SingleInstanceLock
from .mt5_reader import get_account_info
from .process import is_mt5_running
from .state import SyncState


class StatusWindow:
    """Lightweight status window showing agent health and sync state."""

    def __init__(self, config: AgentConfig, config_path: Path):
        self.config = config
        self.config_path = config_path
        self.state_path = self._resolve_state_path(config.state_file)
        self.lock_path = self._resolve_state_path(config.lock_file)

        self.root = Tk()
        self.root.title(f"{WINDOW_TITLE} - Status")
        self.root.geometry("720x560")
        self.root.minsize(720, 560)
        self.root.configure(bg="#08101d")
        self.root.protocol("WM_DELETE_WINDOW", self._close)
        self.root.attributes("-topmost", True)
        self.root.update_idletasks()

        width = 720
        height = 560
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = max(0, (screen_width - width) // 2)
        y = max(0, (screen_height - height) // 2)
        self.root.geometry(f"{width}x{height}+{x}+{y}")

        self.status_labels: dict[str, ttk.Label] = {}

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
        style.configure("Eyebrow.TLabel", background="#08101d", foreground="#67e8f9", font=("Segoe UI Semibold", 10))
        style.configure("Value.TLabel", background="#0f172a", foreground="#f8fafc", font=("Segoe UI Semibold", 11))

    def _set_icon(self) -> None:
        try:
            self.root.iconbitmap(default=str(runtime_icon_path()))
        except Exception:
            return

    def _build_layout(self) -> None:
        outer = ttk.Frame(self.root, style="Root.TFrame", padding=24)
        outer.pack(fill="both", expand=True)
        outer.columnconfigure(0, weight=1)

        ttk.Label(outer, text="TradeJournal Desktop", style="Eyebrow.TLabel").grid(
            row=0, column=0, sticky="w"
        )
        ttk.Label(outer, text="Sync Status", style="Title.TLabel").grid(
            row=1, column=0, sticky="w", pady=(6, 8)
        )
        ttk.Label(
            outer,
            text="Your desktop agent runs quietly in the background and keeps your active MT5 account synced.",
            style="Body.TLabel",
            wraplength=650,
            justify="left",
        ).grid(row=2, column=0, sticky="w", pady=(0, 18))

        card = ttk.Frame(outer, style="Card.TFrame", padding=20)
        card.grid(row=3, column=0, sticky="nsew")
        card.columnconfigure(0, minsize=190)
        card.columnconfigure(1, weight=1)

        rows = [
            ("MT5 Detection", "mt5_detection"),
            ("Backend Connection", "backend_connection"),
            ("Backend URL", "backend_url"),
            ("Last Sync", "last_sync"),
            ("Active Account", "active_account"),
            ("Broker", "broker"),
            ("Login", "login"),
            ("Server", "server"),
            ("Instance Lock", "instance_lock"),
            ("Status", "status"),
        ]

        for row, (label, key) in enumerate(rows):
            self._add_status_row(card, label, key, row)

    def _add_status_row(self, parent: ttk.Frame, label: str, key: str, row: int) -> None:
        ttk.Label(parent, text=f"{label}:", style="Muted.TLabel").grid(
            row=row, column=0, sticky="w", padx=(0, 18), pady=7
        )

        value_label = ttk.Label(parent, text="Loading...", style="Value.TLabel", wraplength=440)
        value_label.grid(row=row, column=1, sticky="w", pady=7)
        self.status_labels[key] = value_label

    def _update_status(self) -> None:
        mt5_running = is_mt5_running(self.config.mt5_process_names)
        account_info = get_account_info() if mt5_running else {
            "connected": False,
            "message": "Open MetaTrader 5 to connect an account.",
            "login": None,
            "broker": None,
            "server": None,
            "name": None,
        }

        mt5_connected = bool(account_info.get("connected"))
        self._set_value(
            "mt5_detection",
            "Connected" if mt5_connected else str(account_info.get("message") or "Not connected"),
            mt5_connected,
        )

        backend_ok, backend_message = self._check_backend()
        self._set_value("backend_connection", "Connected" if backend_ok else backend_message, backend_ok)
        self._set_plain("backend_url", self.config.backend_url or "Not configured", bool(self.config.backend_url))

        self._set_last_sync()

        active_account = (
            account_info.get("name")
            or account_info.get("login")
            or self.config.account_name
            or self.config.account_id
        )
        self._set_plain("active_account", str(active_account) if active_account else "Not Selected", bool(active_account))
        self._set_plain("broker", str(account_info.get("broker") or "Not available"), bool(account_info.get("broker")))
        self._set_plain("login", str(account_info.get("login") or "Not available"), bool(account_info.get("login")))
        self._set_plain("server", str(account_info.get("server") or "Not available"), bool(account_info.get("server")))

        running = self._agent_is_running()
        self._set_plain("instance_lock", "Active" if running else "Available", running)

        setup_complete = bool(self.config.api_key and self.config.backend_url)
        if not setup_complete:
            self._set_value("status", "Setup Incomplete", False)
        elif running:
            self._set_value("status", "Running in Background", True)
        else:
            self._set_value("status", "Setup Complete", True)

    def _set_last_sync(self) -> None:
        try:
            state = SyncState.load(self.state_path)
            if not state.last_deep_sync_at:
                self._set_plain("last_sync", "Never", False)
                return

            last_sync = datetime.fromtimestamp(state.last_deep_sync_at)
            time_ago = self._format_time_ago(datetime.now() - last_sync)
            self._set_value("last_sync", f"{last_sync.strftime('%Y-%m-%d %H:%M:%S')} ({time_ago} ago)", True)
        except Exception:
            self._set_value("last_sync", "Unable to read state", False)

    def _agent_is_running(self) -> bool:
        lock = SingleInstanceLock(self.lock_path)
        if lock.acquire():
            lock.release()
            return False

        return True

    def _check_backend(self) -> tuple[bool, str]:
        if not self.config.backend_url:
            return False, "Not configured"

        url = f"{self.config.backend_url.rstrip('/')}/health"
        request = Request(url, headers={"User-Agent": "TradeJournal-Sync-Agent"})

        try:
            with urlopen(request, timeout=5) as response:
                if response.status < 400:
                    return True, "Connected"
                return False, f"HTTP {response.status}"
        except HTTPError as exc:
            return False, f"HTTP {exc.code}"
        except URLError:
            return False, "Offline"

    def _set_value(self, key: str, value: str, ok: bool) -> None:
        self.status_labels[key].config(
            text=f"{'●' if ok else '●'} {value}",
            foreground="#22c55e" if ok else "#f97316",
        )

    def _set_plain(self, key: str, value: str, ok: bool = True) -> None:
        self.status_labels[key].config(
            text=value,
            foreground="#f8fafc" if ok else "#f97316",
        )

    def _format_time_ago(self, delta) -> str:
        total_seconds = int(delta.total_seconds())
        if total_seconds < 60:
            return f"{total_seconds}s"
        if total_seconds < 3600:
            return f"{total_seconds // 60}m"
        if total_seconds < 86400:
            return f"{total_seconds // 3600}h"
        return f"{total_seconds // 86400}d"

    def _resolve_state_path(self, state_file: str) -> Path:
        state_path = Path(state_file)
        if state_path.is_absolute():
            return state_path
        return self.config_path.parent / state_path

    def _close(self) -> None:
        self.root.destroy()


def show_status_window(config_path: Optional[Path] = None) -> None:
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
