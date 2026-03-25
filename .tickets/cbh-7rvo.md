---
id: cbh-7rvo
status: open
deps: []
links: [cbh-fmtb, cbh-gz2v, cbh-s9w6, cbh-myj2]
created: 2026-03-25T11:19:22Z
type: bug
priority: 2
assignee: Thorben Louw
---
# context: JSON row numbers are 0-indexed, inconsistent with graph (1-indexed) and human output

The context command JSON output uses 0-indexed row numbers, inconsistent with graph command (1-indexed 'line') and human-readable output conventions.

- Exact command: satsuma context 'customer' /tmp/satsuma-bug-hunt/ --json
- Expected: row field should use 1-indexed line numbers for consistency with graph JSON and standard conventions
- Actual: row=35 for customer onboarding (actually line 36 in mappings.stm), row=61 for customer_master (actually line 62 in schemas.stm), etc.
- The graph command uses 1-indexed 'line' field (e.g., minimal_contact line=4 correctly matches file line 4)
- The warnings command has the same 0-indexed row issue (separate ticket cbh-s9w6)
- This inconsistency means consumers cannot use row numbers from different commands interchangeably
- Test file: /tmp/satsuma-bug-hunt/mappings.stm, /tmp/satsuma-bug-hunt/schemas.stm

