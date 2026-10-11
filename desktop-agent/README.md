# StellarX Windows PC Companion

Connect your own Windows computer to StellarX to inspect files, work on projects, and run **reviewed** Command Prompt (CMD) or PowerShell commands.

## Easy setup (Windows)

1. Sign in to [StellarX](https://trystellarai.com/desktop). Click **Create connection code**.
2. Click **Copy Windows setup command**.
3. On the PC you want to connect, open **Windows PowerShell** from Start. Paste the copied command and press Enter.
4. The installer checks for Node.js 20+ (offers a **consent-based**, free install through Windows Package Manager if needed), downloads the companion, pairs it, and starts it. **Keep the PowerShell window open** while working.
5. The website will show **PC connected**. Enter a task, review the plan, and approve each change before it runs.

A **StellarX PC Agent** desktop shortcut is created for the next time you need to reconnect. It does **not** run automatically on Windows startup.

If setup says the code expired, create a new code and copy a new setup command. If you already paired this PC, just double-click the desktop shortcut; do not generate another code.

### Manual setup (optional)

From Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/zitopop/Stellar-AI/main/desktop-agent/install-windows.ps1 | iex
cd "$env:LOCALAPPDATA\StellarAI\DesktopAgent"
node agent.mjs pair YOUR_PAIRING_CODE
.\start-stellar-agent.cmd
```

To check whether a local companion is configured:

```powershell
cd "$env:LOCALAPPDATA\StellarAI\DesktopAgent"
node agent.mjs status
node agent.mjs selftest
```

## CMD and PowerShell (optional, approval required)

PC terminal commands are **off by default** at both levels:

1. In StellarX → **Connection, permissions and activity** → **Terminal commands**, turn on and **Save permissions**.
2. Start the local companion with a temporary opt-in from PowerShell:

```powershell
cd "$env:LOCALAPPDATA\StellarAI\DesktopAgent"
$env:STELLAR_DESKTOP_ALLOW_SHELL = "1"
node agent.mjs run
```

Use that PowerShell window only while you want terminal control. Closing it stops the companion. Starting from the desktop shortcut uses the safer default (shell disabled).

You can then ask "Run `git status` in CMD" or "Run `Get-ChildItem` in PowerShell". The planner includes `shell: "cmd"` or `shell: "powershell"` with every terminal action. Review and approve each command before execution.

Choose a different working folder if needed:

```powershell
$env:STELLAR_DESKTOP_ROOT = "C:\Users\you\Projects"
node agent.mjs run
```

## Safety and scope

- Pairing is tied to the signed-in Stellar account with a short-lived one-time code.
- Your Windows password is **never requested** by StellarX.
- The companion only accesses an explicitly chosen workspace. Windows system and known secret paths are blocked.
- File changes require approval and create backups in `.stellar-backups`; the website keeps an audit trail.
- Commands require local shell opt-in **and** saved website permission **and** per-command approval. Destructive/system/credential-related commands are blocked.
- Mouse/keyboard actions are off by default and separately permissioned.
- Emergency Stop clears queued work; you can disconnect the PC from the website.
- No administrator elevation, Windows startup task, or service is installed by default.

## Available actions

Read/list/search workspace files, inspect Git status/diffs, write/patch files, make directories, run approved CMD/PowerShell commands, open URLs, and (when separately permitted) approved mouse and keyboard interactions.

The coding loop inspects first, proposes edits based on actual observations, asks for approval, then verifies the result.
