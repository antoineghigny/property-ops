# Property-Ops — Residential Property Decision System (Gemini CLI)

> This file is auto-loaded by Gemini CLI as persistent workspace context.
> Slash commands are defined in `.gemini/commands/`.

## What is property-ops

Property-Ops is a residential property acquisition operating system:

- ingest a listing URL or manual property case
- resolve the exact property identity before enrichment
- enrich the case with market, policy, risk, and lender context
- score the deal, finance fit, risk, execution effort, and data confidence
- generate reports, checklists, comparisons, and a bank package

## Data Contract

User layer:

- `config/profile.yml`
- `config/lenders.yml`
- `config/strategy.yml`
- `data/cases/*`
- `data/tracker/*`
- `reports/*`
- `output/*`

System layer:

- `engine/*`
- `adapters/*`
- `packs/*`
- `templates/*`
- `scripts/*`
- `docs/*`
- `modes/*`
- `GEMINI.md`
- `.gemini/commands/*`

Tracked templates:

- `config/profile.example.yml`
- `config/lenders.example.yml`
- `config/strategy.example.yml`

Rule:

- User-specific borrower data belongs in `config/*.yml` and case folders.
- Shared logic belongs in `engine/*`, `adapters/*`, `packs/*`, and `templates/*`.
- Never invent missing evidence when a source is unavailable.
- Surface `unknown` or `manual_review_required` explicitly.
- When a slash command maps to a local CLI command, execute it with the Bash tool instead of only describing it.

## First Run

Before doing anything else in a new Gemini session, run this silently:

```bash
npm run init-user
node scripts/profile-status.mjs --json
```

Interpret the result:

- `ready` → say nothing and continue.
- `missing`, `placeholder`, or `incomplete` → enter onboarding mode before treating finance fit, offer readiness, or bank readiness as personalized.

Onboarding mode should ask for the borrower profile in this order:

1. Identity and household
2. Employment and income
3. Assets and liabilities
4. Monthly life constraints

Use the `question_groups` returned by `node scripts/profile-status.mjs --json` to decide what to ask next.

After each user answer:

1. Update `config/profile.yml` directly.
2. Re-run `node scripts/profile-status.mjs --json`.
3. Continue until the profile becomes `ready`.

Important tradeoff:

- If the user explicitly wants a property-only screening before onboarding, that is allowed.
- In that case, the property analysis may proceed, but finance fit, offer readiness, and bank readiness must be described as provisional and non-personalized.
- Use the explicit CLI flag for that path:
  - `npm run screen -- --url "<listing-url>" --provisional`

## Gemini Slash Commands

| Command | Purpose |
|---------|---------|
| `/property-ops` | Deep autonomous listing screen |
| `/property-ops-profile` | Borrower onboarding and profile updates |
| `/property-ops-ingest` | Create a canonical case from a listing URL or JSON file |
| `/property-ops-resolve-identity` | Normalize the address and geocode the property |
| `/property-ops-analyze` | Run the full enrichment and scoring pipeline |
| `/property-ops-score` | Show the score breakdown |
| `/property-ops-comps` | Show pricing and comparable context |
| `/property-ops-finance` | Show the financing model |
| `/property-ops-collect-docs` | Generate the document checklist |
| `/property-ops-bank-package` | Generate the bank package and optional PDF |
| `/property-ops-visit` | Generate the visit checklist |
| `/property-ops-compare` | Compare multiple cases |
| `/property-ops-tracker` | Build the global tracker |
| `/property-ops-batch` | Analyze multiple manual cases in sequence |
| `/property-ops-negotiate` | Show the negotiation guardrails |
| `/property-ops-refresh` | Re-run analysis for a case |

## Mode Loading

When the user invokes a slash command, load:

- `modes/_shared.md`
- the matching mode file in `modes/`
- `CLAUDE.md`
- any focused docs file when relevant

Use the real CLI commands in `package.json` when you need deterministic artifact generation.

Default behavior for `/property-ops`:

- **DEEP ANALYSIS MANDATE:** Prioritize precision, exhaustive research, and complex modeling over speed.
- **Systematic Web Research:** For every property, perform deep research on local rental market (yield, co-living potential, local demand) and recent comparable sales.
- **Dual Scenario Logic:** If a property fails as a 'home' (residence), systematically calculate the 'investment' scenario (integrating 80% rent income) before rendering a final verdict.
- **Asset-Aware Finance:** Always differentiate between 'immediate cash' and 'securities/assets'. If cash is low but assets are high, report a 'liquidation requirement' rather than a 'refusal'.
- When the user gives a listing URL and the profile is ready, use the autonomous `screen` pipeline rather than a minimal partial flow.
- Let the pipeline finish before summarizing.

## Customization Guide (Open Source)

Property-Ops is designed to be fully customizable for different countries, regions, and investment strategies:

1. **Borrower Profile (`config/profile.yml`):** Define your identity, income, and assets (Cash vs Securities).
2. **Investment Strategy (`config/strategy.yml`):** Define your goals (Home vs Investment), tax tolerance, and co-living preferences.
3. **Regional Packs (`packs/`):** Create or edit YAML files to define registration duties, energy policies, and notary fees for your specific region (e.g., `packs/be-wallonia.yml`).
4. **Lender Policies (`packs/lenders.yml`):** Define bank constraints like max debt ratio (DTI) and recognized rental income percentage.
5. **Expert Audit Mandate:** The system systematically performs web research on local economic drivers based on the property's postcode to ensure non-generic advice.

