---
id: lsp-um8v
status: closed
deps: [lsp-vfn0]
links: []
created: 2026-03-25T17:28:23Z
type: chore
priority: 2
assignee: Thorben Louw
tags: [phase-1, cli]
---
# P1.6: Update CLI test snapshots for canonical refs

Bulk update ~200+ CLI test snapshots to expect canonical [ns]::schema.field format.

## Acceptance Criteria

- All CLI tests pass
- npm test in satsuma-cli exits 0
- No snapshot mismatches remain


## Notes

**2026-03-26T00:15:00Z**

Cause: P1.5 NL ref canonicalization only required 1 test assertion update
Fix: Updated nl-ref-extract.test.js bare workspace fallback assertion to expect ::schema.field form. Bulk P1.4 snapshot updates were already merged on main.
