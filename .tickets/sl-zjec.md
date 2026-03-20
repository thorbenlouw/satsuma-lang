---
id: sl-zjec
status: closed
deps: []
links: []
created: 2026-03-20T16:25:49Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fragment-spread]
---
# schema --json fields array omits fragment spread fields

The satsuma schema --json command includes spread markers in fieldLines but omits spread fields from the fields array. The fields array only contains directly declared fields. This is inconsistent — fieldLines shows "...audit fields" but the structured fields array does not contain the expanded fields.

## Acceptance Criteria

Given schema tgt_customers with ...audit fields spread (containing created_at, updated_at, created_by), the --json output should either: (a) include the expanded fragment fields in the fields array with a marker indicating their origin, or (b) include a spreads array listing which fragments are spread and their field definitions. Currently the fields array silently drops all spread fields while fieldLines shows the raw spread syntax.

