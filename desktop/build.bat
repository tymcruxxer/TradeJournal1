@echo off
REM TradeJournal MT5 Sync Agent Build Script
REM This script builds a standalone .exe using PyInstaller
REM
REM Usage:
REM   build.bat              - Build the agent .exe
REM   build.bat --clean      - Clean build artifacts first
REM   build.bat --upload     - Build and prepare for upload

setlocal enabledelayedexpansion

REM Script directory
cd /d "%~dp0"
set SCRIPT_DIR=%cd%

REM Output directory
set OUTPUT_DIR=%SCRIPT_DIR%\dist
set BUILD_DIR=%SCRIPT_DIR%\build
set INSTALLER_DIR=%SCRIPT_DIR%\installer

REM Colors for output
set GREEN=[92m
set YELLOW=[93m
set RED=[91m
set RESET=[0m

echo.
echo === TradeJournal Sync Agent Build Script ===
echo.

REM Check if --clean flag is set
if "%1"=="--clean" (
    echo Cleaning build artifacts...
    if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
    if exist "%OUTPUT_DIR%" rmdir /s /q "%OUTPUT_DIR%"
    if exist "%INSTALLER_DIR%" rmdir /s /q "%INSTALLER_DIR%"
    echo Clean complete.
)

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python or add it to PATH.
    exit /b 1
)

REM Check if PyInstaller is installed
python -m pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo [INFO] PyInstaller not found. Installing...
    python -m pip install pyinstaller
    if errorlevel 1 (
        echo [ERROR] Failed to install PyInstaller
        exit /b 1
    )
)

REM Check if required packages are installed
echo [INFO] Checking dependencies...
for %%P in (MetaTrader5 numpy psutil requests) do (
    python -m pip show %%P >nul 2>&1
    if errorlevel 1 (
        echo [INFO] Installing missing dependency: %%P
        python -m pip install %%P
    )
)

echo [INFO] Generating branding assets...
python -c "from pathlib import Path; from sync_agent.branding import ensure_branding_assets; ensure_branding_assets(Path('.').resolve() / 'assets')"
if errorlevel 1 (
    echo [ERROR] Failed to generate branding assets
    exit /b 1
)

REM Build the .exe
echo.
echo [INFO] Building TradeJournal-Sync-Agent.exe with PyInstaller...
echo.

python -m PyInstaller tradejournal_agent.spec ^
    --distpath "%OUTPUT_DIR%" ^
    --workpath "%BUILD_DIR%"

if errorlevel 1 (
    echo [ERROR] PyInstaller build failed
    exit /b 1
)

REM Check if exe was created
if exist "%OUTPUT_DIR%\TradeJournal-Sync-Agent.exe" (
    echo.
    echo [SUCCESS] Build complete!
    echo.
    echo Executable: %OUTPUT_DIR%\TradeJournal-Sync-Agent.exe
    echo.
    set ISCC_PATH=
    where /q ISCC.exe
    if not errorlevel 1 set ISCC_PATH=ISCC.exe
    if not defined ISCC_PATH if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" set ISCC_PATH=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe
    if not defined ISCC_PATH if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" set ISCC_PATH=%ProgramFiles%\Inno Setup 6\ISCC.exe

    if defined ISCC_PATH (
        echo [INFO] Building installer package...
        "%ISCC_PATH%" tradejournal_installer.iss
        if errorlevel 1 (
            echo [WARNING] Inno Setup installer build failed. The desktop executable was still created successfully.
        ) else (
            echo [SUCCESS] Installer created in %INSTALLER_DIR%
        )
        echo.
    ) else (
        echo [INFO] Inno Setup was not found. To build the installer, install Inno Setup 6 and rerun build.bat.
        echo.
    )

    echo [INFO] Next steps:
    echo   1. Launch the executable or installer:
    echo      %OUTPUT_DIR%\TradeJournal-Sync-Agent.exe
    echo.
    echo   2. Complete first-run setup in the desktop window.
    echo.
    echo   3. Verify the agent continues running quietly in background.
    echo.
    
    REM Handle --upload flag
    if "%1"=="--upload" (
        echo [INFO] Preparing for upload...
        REM Future: Add artifact upload logic here
    )
) else (
    echo [ERROR] Build succeeded but .exe not found at %OUTPUT_DIR%
    exit /b 1
)

echo.
endlocal
