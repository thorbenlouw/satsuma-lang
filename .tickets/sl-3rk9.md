---
id: sl-3rk9
status: closed
deps: []
links: []
created: 2026-03-28T18:35:36Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [cli, arrows, multi-source, lineage]
---
# bug: multi-source arrow attributes all fields to queried field's schema

When querying arrows on a field that is part of a multi-source arrow (a, b -> c), the CLI incorrectly attributes ALL source fields to the queried field's schema rather than their actual schemas.

Example fixture:
  schema s1 { a x }
  schema s2 { b x }
  schema s3 { c x }
  mapping m { source { s1, s2 } target { s3 } a, b -> c }

Observed:
  satsuma arrows s1.a  →  source: "::s1.a, ::s1.b"  (b is in s2, not s1)
  satsuma arrows s2.b  →  source: "::s2.a, ::s2.b"  (a is in s1, not s2)
  satsuma arrows s3.c  →  source: "::s1.a, ::s1.b"  (uses first source schema for all)

Expected:
  All three queries → source: "::s1.a, ::s2.b"

The source field in the JSON output should always name the schema that actually declares the field, regardless of which field was queried. The CLI appears to resolve all source field names against the queried field's own schema.

## Acceptance Criteria

- satsuma arrows s1.a on a multi-source arrow returns source containing "::s1.a" and "::s2.b" (not ::s1.b)
- satsuma arrows s2.b on the same arrow returns source containing "::s1.a" and "::s2.b" (not ::s2.a)
- satsuma arrows s3.c (target-side) returns the same correct source list
- Smoke test test_04_source_field and test_04_second_source_field updated to assert corrected values


## Notes

**2026-03-28T19:31:45Z**

Cause: arrows.ts used a single sourceSchema (the queried schema) to qualify all source fields in multi-source arrows, instead of looking up which schema actually owns each field.
Fix: Added resolveSourceField() that searches each mapping source schema's field list to find the actual owner. Falls back to first source schema. (commit pending)
