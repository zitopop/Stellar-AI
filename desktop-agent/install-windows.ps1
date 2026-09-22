param(
  [string]$InstallDir = "$env:LOCALAPPDATA\StellarAI\DesktopAgent",
  [string]$Workspace = "$HOME\StellarWorkspace"
)

$ErrorActionPreference = "Stop"
Write-Host "Stellar AI Desktop Agent installer" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js 20+ is required. Install Node.js, then run this installer again."
}
$version = (& node -p "process.versions.node").Trim()
$major = [int]($version.Split('.')[0])
if ($major -lt 20) { throw "Node.js 20+ is required. Found $version." }

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $Workspace | Out-Null

$repoRaw = "https://raw.githubusercontent.com/zitopop/Stellar-AI/main/desktop-agent"
$cacheBust = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
Invoke-WebRequest "$repoRaw/agent.mjs?ts=$cacheBust" -OutFile (Join-Path $InstallDir "agent.mjs")
Invoke-WebRequest "$repoRaw/package.json?ts=$cacheBust" -OutFile (Join-Path $InstallDir "package.json")

$launcher = @"
@echo off
set "STELLAR_DESKTOP_ROOT=$Workspace"
cd /d "$InstallDir"
node agent.mjs run
"@
Set-Content -Path (Join-Path $InstallDir "start-stellar-agent.cmd") -Value $launcher -Encoding ASCII

Write-Host ""
Write-Host "Installed to: $InstallDir" -ForegroundColor Green
Write-Host "Workspace:    $Workspace" -ForegroundColor Green
Write-Host ""
Write-Host "Next:"
Write-Host "1. Open Stellar AI > PC Agent and create a pairing code."
Write-Host "2. Run: cd '$InstallDir'"
Write-Host "3. Run: node agent.mjs pair YOUR_CODE"
Write-Host "4. Run: .\start-stellar-agent.cmd"
Write-Host ""
Write-Host "Shell commands are OFF by default. To enable them for a session:"
Write-Host '$env:STELLAR_DESKTOP_ALLOW_SHELL="1"; .\start-stellar-agent.cmd'
