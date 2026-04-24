# Property-Ops — Residential Property Decision System (Claude Code)

> This file is auto-loaded by Claude Code as persistent workspace context.

## Core Analysis Mandates (CRITICAL)
- **PROFESSIONAL DUE DILIGENCE:** Always balance technical risks with economic growth drivers.
- **MANDATORY INTERVIEW:** Ask for Intent (Home/Invest), Strategy, and Leverage (Cash/Pledging) BEFORE any tool execution.
- **DATA DICTIONARY:** Strictly use the following enums when injecting into `case.json`:
  - `property_kind`: **house**, **apartment**, **income_building**, **land**, **mixed**, **unknown**
  - `condition_kind`: **new**, **old**, **renovated**, **structural_renovation**, **ruin**, **unknown**
- **SKEPTICAL VISUAL AUDIT:** If photos show bare bricks or stripped walls, trigger `structural_renovation` regardless of the listing title.
- **VALUE TRAP PROTECTION:** Systematically calculate terminal value vs project cost. Reject deals with >15% negative equity.

## Master Audit Standard
The final report must be a MASSIVE memorandum (1200+ words) and MUST include:
1. **🎯 DECISION DASHBOARD:** Score and global verdict.
2. **📈 POST-RENOVATION EQUITY AUDIT:** Side-by-side comparison of Revient vs Market Value.
3. **🏢 ECONOMIC AUDIT:** Detailed local employment hubs and infrastructure.
4. **🏗️ TECHNICAL INTEGRITY:** Visual evidence-based works justification.

## Data Contract
- User layer (Local only): `config/profile.yml`, `config/strategy.yml`, `data/cases/*`.
- System layer (Sync to GitHub): `engine/*`, `adapters/*`, `packs/*`, `modes/*`.

## Custom Commands
| Command | Result |
|---------|--------|
| `/property-ops` | Deep autonomous screening (Mandatory Interview) |
| `/property-ops-bank-package` | Generate professional PDF/HTML bank dossier |
| `/property-ops-negotiate` | Technical negotiation strategy |
| `/property-ops-visit` | Detailed inspection checklist |
