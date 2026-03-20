---
id: sl-h1b0
status: open
deps: []
links: []
created: 2026-03-20T16:25:17Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fragment-spread]
---
# arrows command cannot find fields from fragment spreads

The satsuma arrows command fails with "Field not found in schema" when looking up a field that was introduced via a fragment spread. The command does not expand spreads when building its field lookup set.

## Acceptance Criteria

Given fragment "audit fields" with created_at/updated_at, and schema tgt with ...audit fields spread, and a mapping arrow "-> created_at { now_utc() }", running satsuma arrows tgt.created_at should find and display that arrow. Currently it errors with "Field created_at not found in schema tgt". Fix: expand fragment spreads in the field lookup used by the arrows command, same as validate already does.

