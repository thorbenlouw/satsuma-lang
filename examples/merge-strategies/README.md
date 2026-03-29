# merge-strategies

Demonstrates all four merge strategies in a single coherent retail scenario: upsert, append, soft delete, and full refresh.

## Key features demonstrated

- `merge upsert` — customer dimension loaded from CRM, matched on business key
- `merge append` — purchase events streamed into an immutable event log
- `merge soft_delete` — customers flagged as deleted rather than physically removed
- `merge full_refresh` — product catalog truncated and reloaded nightly
- Merge strategy declared in mapping `( )` metadata

## Entry point

`pipeline.stm` — single-file scenario
