---
name: property-ops
description: Residential property command center -- analyze listings, score deals, model financing, build bank packages, compare cases
user_invocable: true
args: mode
argument-hint: "[screen | profile | ingest | resolve-identity | analyze | score | comps | finance | collect-docs | bank-package | visit | compare | tracker | batch | negotiate | refresh]"
---

# property-ops -- Router

## Mode Routing

Determine the mode from `{{mode}}`:

| Input | Mode |
|-------|------|
| (empty / no args) | `discovery` |
| Listing URL or manual property text | `screen` |
| `profile` | `onboarding` |
| `screen` | `screen` |
| `ingest` | `ingest` |
| `resolve-identity` | `resolve-identity` |
| `analyze` | `analyze` |
| `score` | `score` |
| `comps` | `comps` |
| `finance` | `finance` |
| `collect-docs` | `collect-docs` |
| `bank-package` | `bank-package` |
| `visit` | `visit` |
| `compare` | `compare` |
| `tracker` | `tracker` |
| `batch` | `batch` |
| `negotiate` | `negotiate` |
| `refresh` | `refresh` |

If `{{mode}}` is empty, show this menu:

```
property-ops -- Command Center

  /property-ops {listing URL or case text}
  /property-ops profile
  /property-ops screen
  /property-ops ingest
  /property-ops resolve-identity
  /property-ops analyze
  /property-ops score
  /property-ops comps
  /property-ops finance
  /property-ops collect-docs
  /property-ops bank-package
  /property-ops visit
  /property-ops compare
  /property-ops tracker
  /property-ops batch
  /property-ops negotiate
  /property-ops refresh
```

## Context Loading

Always read:

- `CLAUDE.md`
- `modes/_shared.md`

Then load the matching `modes/{mode}.md` file.

For bank package generation, also read `docs/BANK_PACKAGE.md`.

Before personalized finance or bank workflows, run `node scripts/profile-status.mjs --json`.

If the profile status is `missing`, `placeholder`, or `incomplete`:

- Load `modes/onboarding.md`.
- Ask targeted borrower questions based on the returned `question_groups`.
- Update `config/profile.yml` directly after the user answers.
- Re-run `node scripts/profile-status.mjs --json`.
- Do not run the autonomous screen automatically unless the user explicitly requests a provisional property-only screen.

For a listing URL:

- Load `modes/screen.md`.
- If the profile is ready, use the deterministic CLI `npm run screen -- --url "<listing-url>"`.
- If the user explicitly wants a provisional screen, use `npm run screen -- --url "<listing-url>" --provisional`.
- Do not suggest `resolve-identity` as the next step if the screen already attempted it.

Use the deterministic CLI commands in `package.json` whenever an artifact needs to be generated on disk.
