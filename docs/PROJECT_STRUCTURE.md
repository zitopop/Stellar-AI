# Stellar AI project structure

This repository is a live product. The goal is a **predictable place for every file** without breaking public URLs or production routing.

## Golden rule

**Do not add new files to the repository root unless they are a deliberate public route or platform configuration file.**

Existing root files are being migrated gradually because Vercel and older URLs still depend on them.

## Active layout

| Area | Location | What belongs there |
|---|---|---|
| GitHub automation | `.github/workflows/` | CI, audits, deployment workflows |
| API | `api/` | Vercel serverless endpoints |
| Shared runtime | `lib/` | Backend/shared JS modules |
| Browser assets | `lib/assets/` | CSS, JS, icons, images, PWA assets |
| Blog content | `blog/` | Canonical SEO articles |
| Service pages | `services/` | Business and conversion pages |
| Desktop integration | `desktop-agent/` | Desktop-agent package/runtime |
| Roblox integration | `roblox-studio-plugin/` | Roblox Studio plugin code |
| Mobile | `mobile/` | Mobile-specific source/assets |
| Work-agent/Codex | `codex/` | Work-agent feature files |
| Documentation | `docs/` | Current operating and engineering docs |
| Documentation history | `docs/history/` | Dated/superseded recovery notes |
| Scripts | `scripts/` | Build, audit, migration and deployment utilities |
| Tests | `tests/` | Regression/contract tests |
| Public support | `public/` | Static public support files |
| Archive | `archive/` | Retired experiments and historical operations |

## Root policy

The root is reserved for files that currently need root-level URLs or platform discovery.

### Keep at root for now

- `index.html`
- `app.html`
- `blog.html`
- `models.html`
- `support.html`
- legal/public route entry points
- `404.html`, `offline.html`
- `sw.js`
- `manifest.json`
- `robots.txt`
- `sitemap.xml`
- `llms.txt`
- `vercel.json`
- `package.json` / `package-lock.json`
- repository config files such as `.gitignore` and `.vercelignore`

Some older root CSS/JS and compatibility HTML files remain temporarily because existing pages or routing may still reference them. **Do not delete or move them just because the filename looks old.**

## Where new work goes

| New work | Correct location |
|---|---|
| New API route | `api/<name>.js` |
| Shared API helper | `lib/<feature>.js` |
| New browser stylesheet | `lib/assets/<surface>/<name>.css` |
| New browser script | `lib/assets/<surface>/<name>.js` |
| New image/icon | `lib/assets/<surface-or-pwa>/` |
| New SEO article | `blog/<slug>.html` |
| New business page | `services/<slug>.html` |
| New test | `tests/<name>.test.mjs` |
| Build/deploy helper | `scripts/<name>.mjs` |
| Current internal doc | `docs/<TOPIC>.md` |
| Historical incident note | `docs/history/<date>-<topic>.md` |
| Retired experiment | `archive/<feature>/` |
| Deploy trigger/history | `archive/ops/deploy-triggers/` |

## Public-page checklist

Every new public page should have:

1. A deliberate clean URL.
2. A canonical URL.
3. A unique title and description.
4. Internal navigation where appropriate.
5. A sitemap entry only after the page is verified public and indexable.
6. A route/contract test or a manual smoke test.

For a new blog guide, update these together:

```text
blog/<slug>.html
blog.html
sitemap.xml
vercel.json       # only when an explicit rewrite is required
```

## Runtime-change checklist

Before merging/publishing:

```bash
npm run check
npm run build:static
```

For app changes, also verify:

- `/app` loads without a startup hang.
- The prompt can be focused and typed into.
- Sidebar, model picker and Settings open/close.
- Mobile width does not create horizontal overflow.
- Auth, billing, credits and plan entitlements still come from authoritative backend state.

## Cleanup rules

1. **Archive instead of deleting history** when the file may still be useful.
2. Never move route-sensitive root pages without a redirect/rewrite plan and tests.
3. Never move `api/`, `lib/`, `app.html`, `sw.js`, `manifest.json`, `sitemap.xml` or `vercel.json` as casual cleanup.
4. Do not add new one-off deploy-trigger files to root.
5. Do not create a second stylesheet/script when an existing surface-specific asset can be extended safely.
6. Do not commit generated output such as `dist-static/`, dependencies, logs or local runtime state.
7. Do not commit secrets.

## Long-term direction

The clean target is:

```text
api/
app/                 # future app source after a tested routing migration
blog/
services/
lib/
public/
docs/
scripts/
tests/
archive/
```

Root compatibility files can be reduced later in **tested migration batches**, not by bulk-moving them.
