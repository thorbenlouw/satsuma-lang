---
id: cbh-kyv3
status: open
deps: []
links: []
created: 2026-03-25T11:17:04Z
type: bug
priority: 2
assignee: Thorben Louw
---
# meta: mapping note block not shown in output

When running satsuma meta on a mapping that has a note block, the note is not included in the output.

- Exact command: satsuma meta 'customer onboarding' /tmp/satsuma-bug-hunt/
- Expected: The mapping's note block content displayed (contains 'Customer Onboarding Pipeline' with rules about timestamps, NULL handling, and name casing)
- Actual output: 'Metadata for customer onboarding: (no metadata)'
- JSON output also empty: {"scope": "customer onboarding", "entries": []}
- The mapping clearly has a note { """...""" } block at lines 37-48 of mappings.stm
- Compare with metric monthly_revenue which also has a body note block but at least shows header metadata (though also missing the note)
- Test file: /tmp/satsuma-bug-hunt/mappings.stm (customer onboarding mapping, lines 36-74)

