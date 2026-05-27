# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec file for TradeJournal MT5 Sync Agent
# Build with: pyinstaller tradejournal_agent.spec

import os
from pathlib import Path
import sys

# Get the directory containing this spec file
spec_dir = Path(os.getcwd())
if not (spec_dir / "main.py").exists():
    spec_dir = Path(__file__).parent if '__file__' in dir() else Path.cwd()

sys.path.insert(0, str(spec_dir))

from sync_agent.branding import ensure_branding_assets

assets_dir = ensure_branding_assets(spec_dir / "assets")
icon_path = assets_dir / "tradejournal.ico"

a = Analysis(
    [str(spec_dir / "main.py")],
    pathex=[str(spec_dir)],
    binaries=[],
    datas=[
        (str(spec_dir / "agent_config.example.json"), "."),
        (str(icon_path), "assets"),
    ],
    hiddenimports=[
        "MetaTrader5",
        "numpy",
        "psutil",
        "requests",
        "urllib.request",
        "json",
        "logging",
        "logging.handlers",
        "pathlib",
        "argparse",
        "subprocess",
        "sys",
        "os",
        "csv",
        "io",
        "tkinter",
        "tkinter.ttk",
        "tkinter.messagebox",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludedimports=[
        "matplotlib",
        "scipy",
        "pandas",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="TradeJournal-Sync-Agent",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=True,
    icon=str(icon_path),
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
