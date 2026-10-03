# Stellar AI documentation

Use this folder for internal project documentation. Runtime code, public pages and temporary files do not belong here.

## Start here

- [Project structure](PROJECT_STRUCTURE.md) — where every type of file belongs.
- [Project index](PROJECT-INDEX.md) — map of the main product surfaces.
- [Deployment checklist](DEPLOYMENT_CHECKLIST.md) — checks before a production release.
- [AI model routing](AI_MODEL_ROUTING.md) — public Stellar tiers, internal provider IDs and fallback rules.
- [Stellar Deploy](STELLAR_DEPLOY.md) — static backup/deployment notes.
- [App UI maintenance](APP_UI_MAINTENANCE.md) — rules for safe app UI changes.
- [Revenue operations](REVENUE-OPERATIONS-CHECKLIST.md) — operational checks.
- [SEO publishing queue](SEO-PUBLISHING-QUEUE.md) — SEO/content work.
- [Settings extensions](SETTINGS_EXTENSIONS.md) — current Settings extension guidance.

## Documentation folders

- `docs/history/` — dated recovery notes and superseded implementation notes.
- Keep current operating rules directly in `docs/`.
- Do not put deploy-trigger files, screenshots, generated output or experiments in `docs/`.

## Naming

Use clear uppercase topic names for long-lived operating docs, for example:

```text
DEPLOYMENT_CHECKLIST.md
PROJECT_STRUCTURE.md
SEO_PUBLISHING_GUIDE.md
```

Use dated lowercase names only for historical incident/recovery notes:

```text
history/app-access-fix-2026-09-25.md
```
