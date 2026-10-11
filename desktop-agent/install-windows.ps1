param(
  [string]$InstallDir = "$env:LOCALAPPDATA\StellarAI\DesktopAgent",
  [string]$Workspace = "$HOME\StellarWorkspace",
  [ValidatePattern('^[a-fA-F0-9]{16}$')][string]$PairCode = "",
  [switch]$Start
)

$ErrorActionPreference = "Stop"
Write-Host "StellarX Windows setup" -ForegroundColor Cyan
Write-Host "Your PC stays under your control. Shell commands remain OFF by default." -ForegroundColor DarkGray

function Find-Node {
  $command = Get-Command node -ErrorAction SilentlyContinue
  if (-not $command) { return $false }
  $version = (& node -p "process.versions.node").Trim()
  if ($LASTEXITCODE -ne 0) { return $false }
  $major = [int]($version.Split('.')[0])
  return $major -ge 20
}

if (-not (Find-Node)) {
  Write-Host "StellarX needs Node.js 20 or newer." -ForegroundColor Yellow
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    $choice = Read-Host "Install the free Node.js LTS using Windows Package Manager? (Y/N)"
    if ($choice -match '^(y|yes)$') {
      & winget install --id OpenJS.NodeJS.LTS --exact --source winget --accept-package-agreements --accept-source-agreements
      if ($LASTEXITCODE -ne 0) {
        throw "Node.js installation was not completed. Install it from https://nodejs.org/ and retry."
      }
      $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
    }
  }
  if (-not (Find-Node)) {
    throw "Node.js 20+ is needed. Install the free LTS version from https://nodejs.org/, reopen PowerShell and paste your StellarX setup command again."
  }
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $Workspace | Out-Null

$repoRaw = "https://raw.githubusercontent.com/zitopop/Stellar-AI/main/desktop-agent"
$cacheBust = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
Invoke-WebRequest "$repoRaw/agent.mjs?ts=$cacheBust" -OutFile (Join-Path $InstallDir "agent.mjs")
Invoke-WebRequest "$repoRaw/package.json?ts=$cacheBust" -OutFile (Join-Path $InstallDir "package.json")

$launcherPath = Join-Path $InstallDir "start-stellar-agent.cmd"
$launcher = @"
@echo off
set "STELLAR_DESKTOP_ROOT=$Workspace"
set "STELLAR_DESKTOP_ALLOW_SHELL=0"
cd /d "$InstallDir"
node agent.mjs run
if errorlevel 1 pause
"@
Set-Content -Path $launcherPath -Value $launcher -Encoding ASCII

# A shortcut is convenient, but the companion never auto-starts with Windows.
try {
  $desktop = [Environment]::GetFolderPath('Desktop')
  if ($desktop) {
    $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop "StellarX PC Agent.lnk"))
    $shortcut.TargetPath = $launcherPath
    $shortcut.WorkingDirectory = $InstallDir
    $shortcut.Description = "Connect this Windows PC to StellarX (terminal disabled by default)"
    $shortcut.Save()
  }
} catch {
  Write-Host "Desktop shortcut could not be created; the Start script is still available." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installed to: $InstallDir" -ForegroundColor Green
Write-Host "Workspace:    $Workspace" -ForegroundColor Green

if ($PairCode) {
  Write-Host "Pairing with your StellarX account..." -ForegroundColor Cyan
  & node (Join-Path $InstallDir "agent.mjs") pair $PairCode
  if ($LASTEXITCODE -ne 0) { throw "Pairing failed. Generate a new code in StellarX and run the setup command again." }
  Write-Host "PC paired successfully." -ForegroundColor Green
} else {
  Write-Host "To connect: create a code in StellarX, then run:" -ForegroundColor Yellow
  Write-Host "  cd `"$InstallDir`""
  Write-Host "  node agent.mjs pair YOUR_CODE"
}

Write-Host ""
Write-Host "To reconnect later, double-click 'StellarX PC Agent' on your Desktop." -ForegroundColor Green
Write-Host "Or run: $launcherPath"
Write-Host "Terminal commands are OFF. They require separate opt-in and approval." -ForegroundColor DarkGray
if ($Start -and $PairCode) {
  Write-Host ""
  Write-Host "StellarX is connecting. Keep this PowerShell window open while using your PC." -ForegroundColor Cyan
  & node (Join-Path $InstallDir "agent.mjs") run
  if ($LASTEXITCODE -ne 0) { throw "The PC companion stopped. Double-click the StellarX PC Agent shortcut to try again." }
} elseif ($Start) {
  Write-Host "Pair your PC before starting the companion." -ForegroundColor Yellow
}
