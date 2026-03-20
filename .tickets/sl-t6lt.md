---
id: sl-t6lt
status: closed
deps: []
links: []
created: 2026-03-20T16:25:31Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fragment-spread]
---
# graph JSON output omits fragment spread fields from schema nodes

The satsuma graph --json command outputs schema nodes with only directly declared fields, omitting fields from fragment spreads. The fields array in each schema node does not include spread fields.

## Acceptance Criteria

Given schema tgt with customer_id UUID, email VARCHAR(255), and ...audit fields (which defines created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ), the graph JSON output currently only lists customer_id and email in the fields array. Expected: the fields array should also include created_at and updated_at from the expanded fragment. Additionally, the graph should include edges from fragment nodes to the schemas that spread them.

