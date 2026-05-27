# TradeJournal MT5 Sync Agent

TradeJournal Sync Agent is now packaged as a consumer-facing Windows desktop companion app. It still uses the same local MT5 sync architecture, API-key upload flow, AppData storage, locking, and startup scheduling, but first-run setup is handled through a desktop window instead of manual JSON editing.

## Quick Start (Development)

1. Copy `agent_config.example.json` to `agent_config.json`.
2. Set `api_key` to the key from the web app.
3. Confirm `backend_url` points to the backend.
4. Run:

```powershell
python main.py
```

For one sync cycle:

```powershell
python main.py --once
```

Install startup at Windows logon:

```powershell
python main.py --install-startup
```

Check or remove startup:

```powershell
python main.py --startup-status
python main.py --uninstall-startup
```

## Building Packaged .exe (Distribution)

### Prerequisites
- Python 3.8+ installed and in PATH
- Required packages (auto-installed):
  - PyInstaller
  - MetaTrader5
  - psutil
  - requests

### Build Process

Run the build script:

```powershell
cd desktop
build.bat
```

Output will be in `dist/TradeJournal-Sync-Agent.exe`

If Inno Setup 6 is installed, `build.bat` will also create a branded Windows installer in `installer/`.

**Options:**
- `build.bat` — Build the executable
- `build.bat --clean` — Remove old build artifacts before building
- `build.bat --upload` — Build and prepare for upload (future)

### Testing the Built Executable

```powershell
# Launch the desktop app
.\dist\TradeJournal-Sync-Agent.exe

# Force the setup wizard
.\dist\TradeJournal-Sync-Agent.exe --setup

# Run one sync cycle
.\dist\TradeJournal-Sync-Agent.exe --config C:\path\to\config.json --once

# Install as Windows startup task
.\dist\TradeJournal-Sync-Agent.exe --config C:\path\to\config.json --install-startup

# Check startup task status
.\dist\TradeJournal-Sync-Agent.exe --startup-status
```

### Important Notes for Packaged Executable

1. **Configuration Location:**
   - Development mode: Looks in script directory first
   - Packaged mode: Uses `AppData\Roaming\TradeJournal\agent_config.json`
   - Falls back to config in script directory if it exists (migration support)

2. **Runtime Files (Logs, State, Lock):**
   - Development mode: Created in script directory
   - Packaged mode: Created in `AppData\Roaming\TradeJournal\`

3. **First Run:**
   - If config is missing or incomplete, the packaged app opens a setup window
   - Users can paste the API key, verify backend connectivity, and save without editing JSON manually
   - The setup UI can enable Windows startup during onboarding

## Behavior

- Syncs only when `terminal64.exe` or `terminal.exe` is running.
- Runs a quick sync every `quick_sync_interval_seconds`.
- Runs a deep sync every `deep_sync_interval_hours`.
- Uses `X-API-Key` when uploading to `/api/trades/upload`.
- Keeps a local `sync_state.json` ticket cache to avoid repeated uploads.
- Backend also deduplicates by `(user_id, ticket)`.
- Uses `sync_agent.lock` to avoid duplicate running agents.
- Writes rotating logs to `sync_agent.log`.
- Runs as a windowless packaged app after setup so users do not see a flashing terminal window.

## Configuration Reference

See `agent_config.example.json` for all available settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `backend_url` | `http://127.0.0.1:8000` | TradeJournal backend API URL |
| `api_key` | (empty) | API key from web app (REQUIRED) |
| `quick_sync_interval_seconds` | 300 | How often to check MT5 (5 min) |
| `quick_sync_days` | 7 | How many days to sync each time |
| `deep_sync_interval_hours` | 12 | How often to do full resync |
| `deep_sync_days` | 730 | How many days for full resync |
| `log_level` | INFO | Logging verbosity (DEBUG/INFO/WARNING/ERROR) |

## Troubleshooting

### "MetaTrader5 package is not installed"
```powershell
pip install MetaTrader5
```

### Executable opens setup instead of syncing
- This usually means the backend URL or API key is missing or incomplete.
- Complete the setup flow and save the configuration.
- Check `AppData\Roaming\TradeJournal\sync_agent.log` for background sync errors after setup.

### Startup task not installing
- Run Command Prompt as Administrator
- Verify `agent_config.json` path is correct
- Check Windows Task Scheduler for the task "TradeJournal MT5 Sync Agent"

### Logs not being created
- Development mode: Logs created in script directory
- Packaged mode: Logs created in `AppData\Roaming\TradeJournal\`
- Verify that directory exists and is writable
