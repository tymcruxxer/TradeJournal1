@echo off
REM TradeJournal MT5 Sync Agent Build Script
REM This script builds the PyInstaller agent payload and the Inno Setup installer.
REM
REM Usage:
REM   build.bat              - Build the agent .exe and production installer
REM   build.bat --clean      - Clean build artifacts first
REM   build.bat --exe-only   - Build only the raw agent .exe for development
REM   build.bat --upload     - Build and prepare for upload

setlocal enabledelayedexpansion

REM Script directory
cd /d "%~dp0"
set SCRIPT_DIR=%cd%

REM Output directory
set OUTPUT_DIR=%SCRIPT_DIR%\dist
set BUILD_DIR=%SCRIPT_DIR%\build
set INSTALLER_DIR=%SCRIPT_DIR%\installer
set EXE_ONLY=0
set CLEAN=0
set UPLOAD=0
set "INNO_X86=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
set "INNO_X64=%ProgramFiles%\Inno Setup 6\ISCC.exe"

REM Colors for output
set GREEN=[92m
set YELLOW=[93m
set RED=[91m
set RESET=[0m

echo.
echo === TradeJournal Sync Agent Build Script ===
echo.

for %%A in (%*) do (
    if /I "%%~A"=="--clean" set CLEAN=1
    if /I "%%~A"=="--exe-only" set EXE_ONLY=1
    if /I "%%~A"=="--upload" set UPLOAD=1
)

REM Check if --clean flag is set
if "%CLEAN%"=="1" (
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
    if "%EXE_ONLY%"=="1" (
        echo [WARNING] Skipping installer build because --exe-only was provided.
        echo.
    ) else (
        set ISCC_PATH=
        where /q ISCC.exe
        if not errorlevel 1 set "ISCC_PATH=ISCC.exe"
        if not defined ISCC_PATH if exist "!INNO_X86!" set "ISCC_PATH=!INNO_X86!"
        if not defined ISCC_PATH if exist "!INNO_X64!" set "ISCC_PATH=!INNO_X64!"

        if defined ISCC_PATH (
            echo [INFO] Building installer package...
            "%ISCC_PATH%" tradejournal_installer.iss
            if errorlevel 1 (
                echo [ERROR] Inno Setup installer build failed. The raw executable was created, but production download requires the installer.
                exit /b 1
            ) else (
                echo [SUCCESS] Installer created in %INSTALLER_DIR%
                echo Installer: %INSTALLER_DIR%\TradeJournal-Setup.exe
            )
            echo.
        ) else (
            echo [ERROR] Inno Setup was not found. Production download requires TradeJournal-Setup.exe.
            echo Install Inno Setup 6 or rerun with --exe-only for development-only raw executable builds.
            exit /b 1
        )
    )

    echo [INFO] Next steps:
    echo   1. Deploy the installer, not the raw executable:
    echo      %INSTALLER_DIR%\TradeJournal-Setup.exe
    echo.
    echo   2. Run TradeJournal-Setup.exe and complete first-run setup.
    echo.
    echo   3. Verify the agent continues running quietly in background.
    echo.
    
    REM Handle --upload flag
    if "%UPLOAD%"=="1" (
        echo [INFO] Preparing for upload...
        REM Future: Add artifact upload logic here
    )
) else (
    echo [ERROR] Build succeeded but .exe not found at %OUTPUT_DIR%
    exit /b 1
)

echo.
endlocal
