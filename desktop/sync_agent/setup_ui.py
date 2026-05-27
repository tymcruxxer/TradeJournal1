from __future__ import annotations

import json
from pathlib import Path
from tkinter import BooleanVar, StringVar, Tk
from tkinter import messagebox, ttk
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .branding import WINDOW_TITLE, runtime_icon_path
from .config import AgentConfig, config_requires_setup, load_config, save_config
from .startup import install_startup_task


def run_setup_wizard(config_path: Path, initial_message: str | None = None) -> bool:
    wizard = SetupWizard(config_path, initial_message)
    wizard.run()
    return wizard.completed


class SetupWizard:
    def __init__(self, config_path: Path, initial_message: str | None):
        self.config_path = config_path
        self.initial_message = initial_message
        self.completed = False
        self.config = _load_existing_config(config_path)

        self.root = Tk()
        self.root.title(WINDOW_TITLE)
        self.root.geometry("720x520")
        self.root.minsize(720, 520)
        self.root.configure(bg="#08101d")
        self.root.protocol("WM_DELETE_WINDOW", self._close)
        
        # Center window on screen and make it always-on-top for first-run visibility
        self.root.attributes("-topmost", True)
        self.root.update_idletasks()
        width = 720
        height = 520
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = max(0, (screen_width - width) // 2)
        y = max(0, (screen_height - height) // 2)
        self.root.geometry(f"{width}x{height}+{x}+{y}")

        self.backend_url_var = StringVar(value=self.config.backend_url)
        self.api_key_var = StringVar(
            value="" if config_requires_setup(self.config) else self.config.api_key
        )
        self.auto_start_var = BooleanVar(value=True)
        self.status_var = StringVar(
            value=initial_message or "Enter your API key and verify your backend to finish setup."
        )

        self._apply_style()
        self._set_icon()
        self._build_layout()

    def run(self) -> None:
        self.root.mainloop()

    def _apply_style(self) -> None:
        style = ttk.Style(self.root)
        style.theme_use("clam")
        style.configure("Root.TFrame", background="#08101d")
        style.configure("Card.TFrame", background="#0f172a")
        style.configure("Muted.TLabel", background="#0f172a", foreground="#94a3b8", font=("Segoe UI", 10))
        style.configure("Body.TLabel", background="#0f172a", foreground="#e2e8f0", font=("Segoe UI", 10))
        style.configure("Title.TLabel", background="#08101d", foreground="#f8fafc", font=("Segoe UI Semibold", 24))
        style.configure("Eyebrow.TLabel", background="#08101d", foreground="#67e8f9", font=("Segoe UI Semibold", 10))
        style.configure("Section.TLabel", background="#0f172a", foreground="#f8fafc", font=("Segoe UI Semibold", 12))
        style.configure("Primary.TButton", font=("Segoe UI Semibold", 10))
        style.configure("Secondary.TButton", font=("Segoe UI", 10))
        style.configure(
            "Field.TEntry",
            fieldbackground="#0b1220",
            foreground="#f8fafc",
            bordercolor="#1e293b",
            insertcolor="#f8fafc",
            relief="flat",
            padding=10,
        )
        style.map("Primary.TButton", background=[("active", "#0891b2")])

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
        ttk.Label(
            outer,
            text="Finish your desktop sync setup",
            style="Title.TLabel",
        ).grid(row=1, column=0, sticky="w", pady=(6, 10))
        ttk.Label(
            outer,
            text="This companion app runs quietly in the background, detects your local MetaTrader 5 terminal, and uploads trades securely through your TradeJournal API key.",
            style="Body.TLabel",
            wraplength=660,
            justify="left",
        ).grid(row=2, column=0, sticky="w", pady=(0, 18))

        card = ttk.Frame(outer, style="Card.TFrame", padding=22)
        card.grid(row=3, column=0, sticky="nsew")
        card.columnconfigure(0, weight=1)
        card.columnconfigure(1, weight=1)

        ttk.Label(card, text="Backend URL", style="Section.TLabel").grid(
            row=0, column=0, sticky="w"
        )
        ttk.Label(
            card,
            text="Use the hosted API URL for your account or a local backend during development.",
            style="Muted.TLabel",
            wraplength=280,
            justify="left",
        ).grid(row=1, column=0, sticky="w", pady=(4, 10))
        backend_entry = ttk.Entry(card, textvariable=self.backend_url_var, style="Field.TEntry")
        backend_entry.grid(row=2, column=0, sticky="ew", padx=(0, 12))

        ttk.Label(card, text="Desktop Sync API Key", style="Section.TLabel").grid(
            row=0, column=1, sticky="w"
        )
        ttk.Label(
            card,
            text="Copy this from TradeJournal Settings. Manual config file editing is no longer required.",
            style="Muted.TLabel",
            wraplength=280,
            justify="left",
        ).grid(row=1, column=1, sticky="w", pady=(4, 10))
        api_key_entry = ttk.Entry(card, textvariable=self.api_key_var, style="Field.TEntry", show="*")
        api_key_entry.grid(row=2, column=1, sticky="ew")

        details = ttk.Frame(card, style="Card.TFrame")
        details.grid(row=3, column=0, columnspan=2, sticky="ew", pady=(18, 0))
        details.columnconfigure(0, weight=1)

        ttk.Checkbutton(
            details,
            text="Launch automatically when I sign in to Windows",
            variable=self.auto_start_var,
        ).grid(row=0, column=0, sticky="w")
        ttk.Label(
            details,
            text=f"Config location: {self.config_path}",
            style="Muted.TLabel",
            wraplength=620,
            justify="left",
        ).grid(row=1, column=0, sticky="w", pady=(12, 0))

        actions = ttk.Frame(card, style="Card.TFrame")
        actions.grid(row=4, column=0, columnspan=2, sticky="ew", pady=(22, 0))
        actions.columnconfigure(0, weight=1)

        ttk.Button(actions, text="Auto-detect backend", command=self._auto_detect_backend).grid(
            row=0, column=0, sticky="w"
        )
        ttk.Button(actions, text="Verify connection", command=self._verify_connection).grid(
            row=0, column=1, sticky="w", padx=(10, 0)
        )
        ttk.Button(actions, text="Cancel", command=self._close).grid(
            row=0, column=2, sticky="e", padx=(10, 0)
        )
        ttk.Button(
            actions,
            text="Save and launch",
            command=self._save_and_launch,
            style="Primary.TButton",
        ).grid(row=0, column=3, sticky="e", padx=(10, 0))

        status_bar = ttk.Frame(outer, style="Card.TFrame", padding=16)
        status_bar.grid(row=4, column=0, sticky="ew", pady=(18, 0))
        ttk.Label(status_bar, textvariable=self.status_var, style="Body.TLabel", wraplength=640).pack(anchor="w")

        if self.initial_message:
            self.root.after(250, lambda: messagebox.showinfo(WINDOW_TITLE, self.initial_message))

    def _auto_detect_backend(self) -> None:
        candidates = []
        current = self.backend_url_var.get().strip()
        if current:
            candidates.append(current)

        for candidate in ("http://127.0.0.1:8000", "http://localhost:8000"):
            if candidate not in candidates:
                candidates.append(candidate)

        for candidate in candidates:
            ok, message = _health_check(candidate)
            if ok:
                self.backend_url_var.set(candidate)
                self.status_var.set(f"Connected to {candidate}. {message}")
                return

        self.status_var.set("No reachable backend detected automatically. Enter the hosted API URL manually.")
        messagebox.showwarning(
            WINDOW_TITLE,
            "Could not auto-detect a backend. Enter the hosted backend URL from your TradeJournal deployment.",
        )

    def _verify_connection(self) -> bool:
        backend_url = self.backend_url_var.get().strip()
        if not backend_url:
            self.status_var.set("Enter a backend URL before verifying the connection.")
            messagebox.showerror(WINDOW_TITLE, "Enter a backend URL before verifying the connection.")
            return False

        ok, message = _health_check(backend_url)
        self.status_var.set(message)
        if ok:
            messagebox.showinfo(WINDOW_TITLE, message)
            return True

        messagebox.showerror(WINDOW_TITLE, message)
        return False

    def _save_and_launch(self) -> None:
        backend_url = self.backend_url_var.get().strip().rstrip("/")
        api_key = self.api_key_var.get().strip()

        if not backend_url:
            self.status_var.set("A backend URL is required.")
            messagebox.showerror(WINDOW_TITLE, "Enter the backend URL for your TradeJournal account.")
            return

        if not api_key or api_key == "PASTE_API_KEY_HERE":
            self.status_var.set("An API key is required to finish setup.")
            messagebox.showerror(WINDOW_TITLE, "Paste your TradeJournal desktop sync API key to continue.")
            return

        verified = self._verify_connection()
        if not verified:
            proceed = messagebox.askyesno(
                WINDOW_TITLE,
                "The backend health check did not succeed. Save this configuration anyway and continue?",
            )
            if not proceed:
                return

        next_config = self.config
        next_config.backend_url = backend_url
        next_config.api_key = api_key
        save_config(next_config, self.config_path)

        startup_message = "Startup scheduling is enabled."
        if self.auto_start_var.get():
            result = install_startup_task(next_config, self.config_path)
            if result.returncode != 0:
                startup_message = "Startup scheduling could not be enabled automatically. You can retry later from the app."
                messagebox.showwarning(
                    WINDOW_TITLE,
                    f"Setup saved, but Windows startup registration failed.\n\n{result.stderr.strip() or result.stdout.strip()}",
                )
            else:
                startup_message = "Startup scheduling was enabled successfully."

        self.completed = True
        messagebox.showinfo(
            WINDOW_TITLE,
            f"Setup complete. TradeJournal Sync Agent will now continue quietly in the background.\n\n{startup_message}",
        )
        self.root.destroy()

    def _close(self) -> None:
        self.root.destroy()


def _load_existing_config(config_path: Path) -> AgentConfig:
    if not config_path.exists():
        return AgentConfig()

    try:
        return load_config(config_path)
    except Exception:
        try:
            raw = json.loads(config_path.read_text(encoding="utf-8-sig"))
        except Exception:
            return AgentConfig()

        config = AgentConfig()
        if isinstance(raw, dict):
            if isinstance(raw.get("backend_url"), str):
                config.backend_url = raw["backend_url"]
            if isinstance(raw.get("api_key"), str):
                config.api_key = raw["api_key"]
        return config


def _health_check(backend_url: str) -> tuple[bool, str]:
    url = f"{backend_url.rstrip('/')}/health"
    request = Request(url, headers={"User-Agent": "TradeJournal-Sync-Agent"})

    try:
        with urlopen(request, timeout=5) as response:
            payload = response.read().decode("utf-8", errors="replace")
    except HTTPError as exc:
        return False, f"Backend responded with HTTP {exc.code} while checking {url}."
    except URLError as exc:
        return False, f"Could not reach {url}: {exc.reason}."

    if response.status >= 400:
        return False, f"Backend responded with HTTP {response.status} while checking {url}."

    return True, f"Connected to TradeJournal backend successfully at {url}."
