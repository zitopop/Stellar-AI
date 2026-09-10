# Contributing to Stellar AI

Thanks for helping improve Stellar AI.

1. Create a focused branch from `main`.
2. Keep each change small and preserve existing public URLs and product behaviour unless a change explicitly requires otherwise.
3. Never commit `.env` files, API keys, tokens or other secrets.
4. Run `node --test tests/*.test.mjs` before opening a pull request.
5. In the pull request, explain what changed, why it is safe, and how it was verified.

For UI refactors, include a visual/interaction check and avoid unrelated style changes. For billing or authentication work, include focused regression coverage.
