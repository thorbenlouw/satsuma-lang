---
id: sl-oeem
status: closed
deps: [sl-3ccy]
links: []
created: 2026-03-28T18:35:54Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, arrows, spreads, fragments]
---
# bug: spread fields not expanded when resolving field references in arrows command

When a schema includes fields via a fragment spread (...f), the arrows command cannot find those fields by the schema.field reference. The CLI does not expand fragment spreads during field lookup.

Example:
  fragment f { id x  code x }
  schema s1 { ...f  extra x }
  mapping m { source { s1 } target { s2 }  id -> id }

Observed:
  satsuma arrows s1.id  →  "Field 'id' not found in schema 's1'"  (exit 1)

Expected:
  satsuma arrows s1.id  →  returns the arrow, since id is a field of s1 via the spread

Spread fields should be first-class members of the schema for all CLI operations.

## Acceptance Criteria

- satsuma arrows s1.id works when id comes from a fragment spread on s1
- satsuma fields s1 lists spread-sourced fields alongside inline fields
- Smoke test test_09_spread_field_not_found updated to expect exit 0 and correct arrow


## Notes

**2026-03-28T19:31:45Z**

Cause: Grammar consumed the next field declaration as part of the spread name (sl-3ccy). After the grammar fix, spread names parse correctly and expandEntityFields returns spread fields normally.
Fix: Auto-resolved by sl-3ccy grammar fix. No additional changes needed. (commit c5c5bf6)
