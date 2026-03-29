# protobuf-to-parquet

Consumes protobuf commerce events from Kafka and produces a session-level Parquet dataset for product analytics, grouping events by session and computing aggregate metrics.

## Key features demonstrated

- `format protobuf` with `schema_registry` and `tag` field annotations
- Nested repeated fields
- Group-by aggregation over session events
- Per-field error-handling defaults (`on_error`)
- Session metric derivation (purchase totals, product breadth, checkout completion)

## Entry point

`pipeline.stm` — single-file scenario
