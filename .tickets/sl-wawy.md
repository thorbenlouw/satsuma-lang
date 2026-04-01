---
id: sl-wawy
status: closed
deps: []
links: []
created: 2026-03-31T08:25:16Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, exploratory-testing]
---
# where-used: --help JSON shape documents only 4 'kind' values, actual output has 6+

The where-used --help documents the JSON 'kind' field as: "mapping"|"metric"|"schema"|"nl_ref"

Actual kind values observed:
- mapping (documented)
- metric (documented)
- nl_ref (documented)
- ref_metadata (undocumented — for (ref) metadata references)
- fragment_spread (undocumented — for ...fragment spreads)
- import (undocumented — for import statements)
- transform_call (undocumented — for transform invocations in arrows)

The 'schema' kind documented in the help was never observed in testing. Consumers relying on the documented shape will encounter unexpected kind values.


## Notes

**2026-04-01T09:16:37Z**

Cause: The where-used help text documented an outdated JSON kind set that no longer matched the command's emitted ref kinds.
Fix: Updated the where-used --help JSON contract and added regression coverage to keep the documented kind surface aligned with actual output (commit a1e7949).
