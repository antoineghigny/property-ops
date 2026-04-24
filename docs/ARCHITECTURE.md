# Architecture

Property-Ops is organized as:

- canonical case data in `data/cases/*`
- rule and lender packs in `packs/*`
- source adapters in `adapters/*`
- core decision logic in `engine/*`
- generated artifacts in `reports/*` and `output/*`

The system separates:

- `property_facts`
- `market_context`
- `policy_context`
- `lender_assumptions`

It also separates:

- observations
- rules
- derived metrics
- decisions
