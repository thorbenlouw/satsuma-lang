# json-api-to-parquet

Ingests order responses from a commerce REST API (v2) and lands two curated Parquet datasets: one row per order header and one row per line item.

## Key features demonstrated

- `format json` schema with `jsonpath` field annotations
- Nested `record` fields and variable-length arrays
- Multi-target mapping producing both header and line-level outputs
- Free-form metadata preserved as a raw JSON blob
- Optional array handling (`discounts`)

## Entry point

`pipeline.stm` — single-file scenario
