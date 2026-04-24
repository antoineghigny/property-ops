# Property-Ops for Codex

Read `CLAUDE.md` for all project instructions. They apply equally to Codex.

Key rules:

- Keep user-specific data in `config/*.yml`, `data/*`, and case folders.
- Keep shared logic in `engine/*`, `adapters/*`, `packs/*`, and `templates/*`.
- Do not invent data when an official source is unavailable.
- Surface `manual_review_required` instead of pretending certainty.
- Use `npm run init-user` to create local user files from tracked `*.example.yml` templates when needed.
- Run `node scripts/profile-status.mjs --json` before personalized finance workflows.
- If the profile is not ready, use onboarding first and update `config/profile.yml` directly.
- For a plain listing URL, prefer `npm run screen -- --url "<listing-url>"` over manually chaining `ingest`, `resolve-identity`, and `analyze`.
