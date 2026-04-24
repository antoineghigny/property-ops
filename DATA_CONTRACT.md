# Data Contract

This project separates user-specific case data from shared system logic.

## User Layer

These files contain user data, case data, generated artifacts, and operating history.

- `config/profile.yml`
- `config/lenders.yml`
- `config/strategy.yml`
- `data/cases/*`
- `data/tracker/*`
- `data/decision-log/*`
- `data/document-vault/*`
- `reports/*`
- `output/*`

## System Layer

These files contain shared logic, rules, templates, and adapters.

- `engine/*`
- `adapters/*`
- `packs/*`
- `templates/*`
- `scripts/*`
- `docs/*`

## Rule

User-layer files must remain safe to customize and should not be overwritten by upstream system changes.
