# metrics-platform

Defines key business metrics (MRR, CLV, churn, conversion, order revenue) derived from the Salesforce → Snowflake pipeline and commerce order lakehouse.

## Key features demonstrated

- `metric` declarations as terminal lineage nodes
- `source`, `grain`, `slice`, and `filter` metric metadata
- `measure additive` vs `measure non_additive` field annotations
- Multi-file workspace: source schemas separated from metric definitions
- Import within workspace using `./metric_sources.stm`

## Entry point

`metrics.stm` imports from `metric_sources.stm`
