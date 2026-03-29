# xml-to-parquet

Ingests canonical commerce order XML messages from the integration bus and lands two curated Parquet datasets: one row per order header and one row per line item.

## Key features demonstrated

- `format xml` schema with `xpath` field and record annotations
- Namespace-qualified XML with repeated discount fragments
- Optional elements (loyalty identifiers) and mixed timestamp formats
- Multi-target mapping producing both header and line-level outputs

## Entry point

`pipeline.stm` — single-file scenario
