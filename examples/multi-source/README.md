# multi-source

Three examples showing different patterns for combining data from multiple independent sources into unified targets.

## Key features demonstrated

- `multi-source-arrows.stm` — comma-separated source paths contributing to a single target field
- `multi-source-hub.stm` — data hub aggregating CRM, payment, and inventory sources to multiple targets
- `multi-source-join.stm` — three-way join with aggregation and NL-described join conditions; imports fragment from `../lib/common.stm`

## Entry point

Each `.stm` file is independently runnable. Start with `multi-source-hub.stm` for the most complete example.
