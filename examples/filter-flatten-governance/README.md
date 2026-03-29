# filter-flatten-governance

Demonstrates three language idioms in an integrated retail analytics pipeline: scalar list fields, filter/flatten for nested arrays, and governance metadata annotations.

## Key features demonstrated

- `list_of TYPE` scalar list fields
- `filter` on repeated schema fields to exclude elements at definition time
- `flatten` in mappings to lift nested list elements into flat output rows
- `classification`, `retention`, `pii`, `encrypt` governance annotations at schema and field level
- Multi-source join with filter condition as row selector

## Entry point

`filter-flatten-governance.stm` — main pipeline (imports nothing)<br>
`governance.stm` — standalone governance metadata example (Customer 360)
