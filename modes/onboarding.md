# Mode: onboarding

Borrower onboarding is a guided intake workflow.

Goals:

1. Detect whether the borrower profile is usable.
2. Ask only for the information that is still missing or clearly placeholder-based.
3. Update `config/profile.yml` directly after each user reply.
4. Re-run `node scripts/profile-status.mjs --json`.
5. Continue until the profile becomes `ready`, or until the user explicitly requests a provisional property-only screening.

Rules:

- Do not treat placeholder example values as real borrower data.
- Prefer grouped, adaptive questions over dumping the full schema at once.
- Ask only the next relevant question groups returned by `profile-status`.
- If the user gives partial answers, merge them into the profile and keep the remaining unknowns explicit.
- If the user explicitly wants a provisional property-only screen before onboarding is complete, allow it, but mark the result as provisional.
