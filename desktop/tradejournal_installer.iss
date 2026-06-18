#define AppName "TradeJournal Sync Agent"
#define AppVersion "1.0.0"
#define AppPublisher "TradeJournal"
#define AppExeName "TradeJournal-Sync-Agent.exe"
#define AppSetupName "TradeJournal-Setup"

[Setup]
AppId={{6F24D54C-E84B-4503-82E0-16A47E4F1447}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL=https://tradejournal1.onrender.com
AppSupportURL=https://tradejournal1.onrender.com
DefaultDirName={autopf}\TradeJournal Sync Agent
DefaultGroupName=TradeJournal
DisableProgramGroupPage=yes
WizardStyle=modern
Compression=lzma
SolidCompression=yes
OutputDir=installer
OutputBaseFilename={#AppSetupName}
SetupIconFile=assets\tradejournal.ico
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName}
ArchitecturesInstallIn64BitMode=x64compatible

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: "dist\{#AppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\TradeJournal\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{autoprograms}\TradeJournal\Sync Status"; Filename: "{app}\{#AppExeName}"; Parameters: "--status"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Launch {#AppName} Setup"; Parameters: "--setup"; Flags: postinstall skipifsilent

[Messages]
WelcomeLabel1=Welcome to TradeJournal Desktop Sync
WelcomeLabel2=This setup installs the secure local companion app that connects MetaTrader 5 to your TradeJournal dashboard.
FinishedLabel=TradeJournal Desktop Sync has been installed. Keep "Launch TradeJournal Sync Agent Setup" selected to enter your API key and start syncing.
