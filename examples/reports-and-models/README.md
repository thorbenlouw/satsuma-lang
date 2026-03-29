# reports-and-models

Demonstrates how to document reports, dashboards, and ML models as first-class pipeline consumers in Satsuma, closing the lineage graph at the point of consumption.

## Key features demonstrated

- `report` and `model` schema-level metadata tokens
- `source { schemas }` to declare upstream dependencies and create lineage edges
- `tool` and `registry` metadata identifying the platform where the consumer lives
- Consumer schemas as terminal nodes (data flows in, nothing flows out)

## Entry point

`pipeline.stm` — single-file scenario
