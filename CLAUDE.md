# Property-Ops

## Data Contract

User layer:

- `config/profile.yml`
- `config/lenders.yml`
- `config/strategy.yml`
- `data/cases/*`
- `data/tracker/*`
- `data/decision-log/*`
- `data/document-vault/*`
- `reports/*`
- `output/*`

System layer:

- `engine/*`
- `adapters/*`
- `packs/*`
- `templates/*`
- `scripts/*`
- `docs/*`
- `GEMINI.md`
- `.gemini/*`
- `.claude/skills/*`

Tracked templates:

- `config/profile.example.yml`
- `config/lenders.example.yml`
- `config/strategy.example.yml`

## Operating rules

- Prefer official sources and open data.
- Never silently convert a lender practice into a legal rule.
- Never overwrite user files when a shared-system change is enough.
- Keep artifacts deterministic and reproducible.
- Treat `config/*.yml`, `data/cases/*`, and tracker outputs as private local state that should stay out of Git.

## First Run and Onboarding

- Before personalized finance, offer, or bank workflows, run `node scripts/profile-status.mjs --json`.
- If local user files are missing, run `npm run init-user` first to copy them from the tracked `*.example.yml` templates.
- If the profile status is `missing`, `placeholder`, or `incomplete`, enter onboarding mode first.
- Use `modes/onboarding.md` for the borrower intake workflow.
- Update `config/profile.yml` directly after the user answers.
- Re-run `node scripts/profile-status.mjs --json` until the profile becomes `ready`.
- Only if the user explicitly asks for a provisional property-only screen may you bypass onboarding.

## Default Listing Workflow

- For a plain listing URL, use the autonomous screen pipeline, not a manual chain of suggestions.
- Load `modes/screen.md`.
- If the profile is ready, run `npm run screen -- --url "<listing-url>"`.
- If the user explicitly wants a provisional screen before onboarding is complete, run `npm run screen -- --url "<listing-url>" --provisional`.
- Do not suggest `resolve-identity` as a next step if the screen already attempted it.
