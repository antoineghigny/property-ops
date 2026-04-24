# Property-Ops

Property-Ops is an agentic operating system for residential property analysis, financing preparation, due diligence, and bank package generation.

The intended behavior is the same across Gemini CLI, Claude Code, and Codex: onboarding first when the borrower profile is not ready, then an autonomous precision-first screen for a plain listing URL.

It follows the same operating-system pattern throughout the repo:

- ingest a listing or manual case
- resolve the exact property identity
- enrich it with sourced market, policy, and lender context
- compute decision signals and price guardrails
- generate reports, visit checklists, document checklists, and bank packages
- track decisions and compare multiple properties over time

## Core Principles

- No fake data.
- No silent assumptions.
- Official and open-data sources first.
- Bank heuristics are modeled separately from legal rules.
- Missing information is explicit: `unknown` or `manual_review_required`.

## Quick Start

```bash
cd property-ops
npm install
npx playwright install chromium

npm run init-user
npm run doctor
npm run profile-status
```

`npm run init-user` copies the tracked `*.example.yml` templates into local user-owned files. Those local files are ignored by `.gitignore`, along with case folders and tracker outputs, so personal borrower data and private deal analysis stay out of Git by default.

## Gemini CLI

Open Gemini from the repository root so it can load the local workspace commands:

```bash
cd property-ops
gemini
```

Then type `/` to list the available `property-ops` slash commands.

If Gemini was already open before the `.gemini/commands/` files existed, restart the session from the `property-ops/` directory.

On the first Gemini interaction, Property-Ops now checks whether `config/profile.yml` is still missing, incomplete, or placeholder-based. If it is, Gemini should enter borrower onboarding before treating finance-fit or bank-readiness outputs as personalized.

The agent-facing onboarding path is `/property-ops-profile`. It should ask targeted borrower questions, update `config/profile.yml`, re-check readiness, and only then allow a personalized finance workflow.

The default `/property-ops <listing-url>` behavior is intended to be autonomous and precision-first. It should use the deep `screen` pipeline rather than merely chaining lightweight suggestions.

The same repo rules are now documented for Claude Code and Codex through [CLAUDE.md](/home/antoine/repository/buy/property-ops/CLAUDE.md), [AGENTS.md](/home/antoine/repository/buy/property-ops/AGENTS.md), and [.claude/skills/property-ops/SKILL.md](/home/antoine/repository/buy/property-ops/.claude/skills/property-ops/SKILL.md).

The repository is meant to track examples and shared system logic, not your real borrower profile or private case data.

## Main Commands

```bash
npm run init-user
npm run profile-status
npm run screen -- --url "https://example.com/listing"
npm run ingest -- --url "https://example.com/listing"
npm run resolve-identity -- --case my-case
npm run analyze -- --case my-case
npm run collect-docs -- --case my-case
npm run bank-package -- --case my-case --pdf
npm run visit -- --case my-case
npm run compare -- --cases my-case,other-case
npm run tracker
```

## Project Layout

- `config/`: borrower, lender, and strategy settings
- `data/cases/`: canonical case storage
- `packs/`: country, region, lender, and source-policy packs
- `engine/`: core analysis logic
- `adapters/`: data-source and portal adapters
- `templates/`: markdown and HTML rendering templates
- `scripts/`: CLI and verification scripts
- `.gemini/commands/`: Gemini CLI slash commands
- `GEMINI.md`: Gemini persistent workspace context

## Notes

- Belgium is modeled through `country -> region -> rule pack`.
- Real official adapters are wired where practical, especially:
  - Statbel municipality-level price medians
  - Belgium regional policy packs
  - Brussels / Wallonia / Flanders policy and registry references
- Where a public source is lookup-only or operationally fragile, the system produces a live lookup URL and `manual_review_required` instead of inventing a result.
