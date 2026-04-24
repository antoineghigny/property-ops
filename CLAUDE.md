# Property-Ops — Residential Property Decision System (Claude Code)

> This file is auto-loaded by Claude Code as persistent workspace context.

## What is property-ops
Property-Ops is a residential property acquisition operating system designed for professional-grade due diligence.

## Core Analysis Mandates (CRITICAL)
- **DEEP ANALYSIS MANDATE:** Prioritize precision, exhaustive research, and complex modeling over speed.
- **Systematic Web Research:** For every property, perform deep research on local rental market (yield, co-living potential, local demand) and recent comparable sales.
- **Dual Scenario Logic:** If a property fails as a 'home' (residence), systematically calculate the 'investment' scenario (integrating 80% rent income) before rendering a final verdict.
- **Asset-Aware Finance:** Always differentiate between 'immediate cash' and 'securities/assets'. If cash is low but assets are high, report a 'liquidation requirement' rather than a 'refusal'.
- **Corporate Feasibility Protocol:** Mandatory pre-flight interviews to align strategy (Home vs. Yield) before running scripts.

## Expert Audit Standard
All final reports must be exhaustive (1000+ words) and include:
1. **Decision Dashboard:** High-level scores and metrics.
2. **Local Economic Audit:** Identification of specific demand drivers (Employment hubs, infrastructure).
3. **Net-Net Financial Modeling:** Precision cash-flow including vacancy and maintenance.
4. **The "Expert's Eye":** Actionable negotiation levers.

## Data Contract
User layer (Local only): `config/profile.yml`, `config/strategy.yml`, `data/cases/*`.
System layer (Sync to GitHub): `engine/*`, `adapters/*`, `packs/*`, `modes/*`.

## Custom Commands
| Command | Result |
|---------|--------|
| `/property-ops` | Deep autonomous screening (Mandatory Interview) |
| `/property-ops-bank-package` | Generate professional PDF/HTML bank dossier |
| `/property-ops-negotiate` | Technical negotiation strategy |
| `/property-ops-visit` | Detailed inspection checklist |
