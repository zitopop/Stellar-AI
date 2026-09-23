#!/usr/bin/env bash
# Vercel Ignored Build Step.
# Exit 0 = skip deployment. Exit 1 = continue deployment.
# Compare against the last successful deployment when Vercel provides it,
# so a run of skipped test/docs commits cannot hide a later real code change.
set -euo pipefail

BASE="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"

if ! git rev-parse --verify "${BASE}^{commit}" >/dev/null 2>&1; then
  echo "No reliable previous deployment SHA; building safely."
  exit 1
fi

CHANGED="$(git diff --name-only "$BASE" HEAD || true)"
if [ -z "$CHANGED" ]; then
  echo "No file changes detected; skipping build."
  exit 0
fi

while IFS= read -r file; do
  case "$file" in
    tests/*|docs/*|archive/*|.github/*|README.md|*.md)
      ;;
    *)
      echo "Deployable change detected: $file"
      exit 1
      ;;
  esac
done <<< "$CHANGED"

echo "Only tests/docs/archive/workflow/Markdown files changed; skipping Vercel build."
exit 0
