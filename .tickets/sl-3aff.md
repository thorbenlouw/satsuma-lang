---
id: sl-3aff
status: open
deps: []
links: []
created: 2026-03-20T16:25:09Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fragment-spread]
---
# fields command drops fragment spread fields

The satsuma fields command silently drops all fields from fragment spreads. Only directly declared fields are shown.

## Acceptance Criteria

Given a schema with ...audit fields spread (where audit fields defines created_at TIMESTAMPTZ and updated_at TIMESTAMPTZ), running satsuma fields <schema> only shows directly declared fields and omits created_at and updated_at. Expected: the command should resolve and expand fragment spreads, inlining fragment fields into the output. This should work for simple spreads, transitive spreads (fragments spreading other fragments), and namespace-qualified spreads.

