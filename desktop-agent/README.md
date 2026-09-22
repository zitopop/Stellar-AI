# Stellar Desktop Agent

Owner-only Windows companion for Stellar AI.

## Security model

- The web app never receives Windows credentials.
- Pairing uses a short-lived one-time code.
- Device authentication uses a random local token.
- File actions are restricted to one workspace root.
- Shell execution is disabled unless the local user explicitly launches the agent with `STELLAR_DESKTOP_ALLOW_SHELL=1`.
- Write actions create backups in `.stellar-backups`.
- The agent does not request or read password stores, browser cookies, private keys, wallet seeds, or system credential stores.
- No administrator elevation or persistence is installed by the default script.

## Install on Windows

Run `install-windows.ps1` from PowerShell, then pair using the code created in the Stellar AI owner UI.

## Commands

```powershell
node agent.mjs pair YOUR_PAIRING_CODE
node agent.mjs run
node agent.mjs status
```

Choose the allowed working folder:

```powershell
$env:STELLAR_DESKTOP_ROOT="C:\Users\you\Projects"
node agent.mjs run
```

Enable reviewed terminal commands for that process only:

```powershell
$env:STELLAR_DESKTOP_ALLOW_SHELL="1"
node agent.mjs run
```

## Current actions

- read file
- list directory
- search repository text
- inspect git status
- inspect git diff
- write file
- create directory
- run reviewed shell command
- open an http/https URL

## Coding-agent loop

The owner UI uses an inspect-first workflow: understand the task, inspect the real repository with read-only tools, build a grounded implementation plan from those observations, require approval for writes/commands, then review the resulting git diff. This keeps the experience closer to a repository coding agent than a one-shot chatbot while preserving explicit control over risky local actions.

GUI clicking/typing is intentionally not enabled in this first secure version. Add it later through a dedicated Windows UI-automation module with separate permissions and visible user controls.
