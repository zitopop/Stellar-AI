# Repository archive

This directory stores **non-runtime historical material** so the production repository stays understandable.

## What belongs here

- retired experiments
- superseded templates
- historical prompts
- old operational notes
- one-off deployment trigger notes
- legacy pages kept for reference
- material that should not be part of the active public site

## Current archive areas

```text
archive/docs/                  superseded documentation
archive/legacy-blog/           retired blog material
archive/ops/                   historical operational/deploy notes
archive/prompts/               retired prompt material
archive/templates/             old/reference templates
```

Use a descriptive or dated subfolder instead of adding loose files directly to `archive/`.

## Rules

1. Do not move a live page or runtime dependency here until references and routes have been checked.
2. Archived files should not be linked from the production website.
3. Production route audits intentionally ignore `archive/`.
4. Vercel production uploads intentionally ignore `archive/`.
5. If an archived file becomes active again, move/copy it back into the correct active folder and add tests rather than serving it directly from the archive.

For current file placement rules, see [`docs/PROJECT_STRUCTURE.md`](../docs/PROJECT_STRUCTURE.md).
