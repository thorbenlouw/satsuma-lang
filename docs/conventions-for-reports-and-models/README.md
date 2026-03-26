# Reports and ML Models Conventions

## Why This Matters

Data pipelines do not end at the warehouse. Reports, dashboards, and ML models are the real consumers of curated data — they are what stakeholders actually see and what models actually train on. Yet most lineage graphs stop at the last table load, leaving a blind spot between "data landed" and "business value delivered."

Documenting reports and models as Satsuma schemas makes lineage complete. When a column in `dim_customer` changes, tooling can trace the impact all the way through to the Looker dashboard that displays it or the churn model that uses it as a feature. Without this final link, impact analysis is always incomplete.

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `report` | Marks this schema as a report or dashboard | `schema weekly_sales (report) { }` |
| `model` | Marks this schema as an ML model | `schema churn_predictor (model) { }` |
| `source {schemas}` | Upstream schema dependencies | `source {fact_orders, dim_customer}` |
| `tool <name>` | BI or ML platform | `tool looker` |
| `dashboard_id "<id>"` | Asset identifier on the BI platform | `dashboard_id "retail-weekly-001"` |
| `refresh schedule "<cron>"` | Update or retrain schedule | `refresh schedule "Monday 06:00 UTC"` |
| `registry <platform>` | Model registry platform | `registry mlflow` |
| `experiment "<name>"` | Experiment or run identifier in the registry | `experiment "churn-v3"` |

All of these are vocabulary tokens — they live in `( )` metadata and are interpreted by convention, not enforced by the grammar.

### Guidelines

- **Always include `source {}`** — the whole point of documenting consumers is to close the lineage loop. A report or model without declared sources is an orphan node.
- **Fields represent what the consumer exposes**, not what it stores. For a dashboard, fields are the measures and dimensions visible to users. For an ML model, fields are features and outputs.
- **Use `tool` to name the platform.** Add separate key-value entries for asset identifiers (`dashboard_id "abc"`, `workbook_id "xyz"`, `endpoint "url"`).
- **Mappings are optional.** Consumer schemas typically declare `source` dependencies in metadata rather than detailed field-level mappings. Add a mapping only when the derivation logic is non-obvious and worth documenting.
- **Compose freely with governance tokens.** `classification`, `retention`, `pii`, and `owner` work on report and model schemas exactly as they do on any other schema.

## How Natural Language Helps

Reports and models often have business context that does not fit neatly into metadata tokens:

- **Audience and purpose** — "Executive weekly review; filters default to current quarter" — a `note` on the schema tells consumers who this is for and how it is used.
- **Feature engineering** — "30-day rolling average of order count, excluding returns" — an ML feature's derivation is best captured as a natural language description rather than a pseudo-formula.
- **Refresh semantics** — "Retrained weekly; promoted to production only if AUC > 0.82" — promotion criteria do not have a structural home but matter for operations.
- **Known limitations** — "Dashboard does not account for currency conversion; all amounts shown in local currency" — warnings that downstream consumers need.

These belong in `note` metadata on schemas and fields, or in top-level `note { }` blocks.

## Patterns

### 1. Dashboard with Source Dependencies and Schedule

```satsuma
schema weekly_sales_dashboard (
  report,
  source {fact_orders, dim_product},
  tool looker,
  dashboard_id "retail-weekly-001",
  refresh schedule "Monday 06:00 UTC",
  owner "analytics-team",
  note "Executive weekly sales overview — filters default to current quarter"
) {
  total_revenue     DECIMAL(14,2)  (note "Sum of fact_orders.net_amount for the period")
  units_sold        INTEGER        (note "Count of fact_orders.quantity")
  top_product       VARCHAR(200)   (note "Product with highest revenue in the period")
  region            VARCHAR(50)    (note "Dimension slicer from dim_product.region")
  week_ending_date  DATE           (note "Last day of the reporting week")
}
```

Fields represent the measures and dimensions visible on the dashboard. The `source` token declares which upstream schemas feed it, closing the lineage graph.

### 2. ML Model with Features, Output, and Registry

```satsuma
schema churn_predictor (
  model,
  source {dim_customer, fact_orders},
  registry mlflow,
  experiment "churn-v3",
  refresh schedule "Sunday 02:00 UTC",
  note "Binary classifier predicting 90-day churn. Retrained weekly; promoted if AUC > 0.82."
) {
  customer_tenure_days  INTEGER        (note "Days since first order")
  order_count_30d       INTEGER        (note "Orders in the last 30 days")
  avg_order_value       DECIMAL(10,2)  (note "Mean order value over customer lifetime")
  days_since_last_order INTEGER        (note "Recency signal — days since most recent order")
  churn_probability     DECIMAL(5,4)   (note "Model output: probability of churn in next 90 days")
}
```

Feature fields document inputs to the model. The output field (`churn_probability`) is the prediction. `registry` identifies where the trained model is versioned and deployed.

### 3. Report with Governance Tokens Composed

```satsuma
schema customer_risk_report (
  report,
  source {dim_customer, fact_orders, churn_predictor},
  tool tableau,
  workbook_id "risk-ops-2024",
  classification "CONFIDENTIAL",
  owner "risk-ops",
  retention "2y",
  note "Operational risk dashboard — restricted to risk-ops team"
) {
  customer_id       UUID           (required)
  customer_name     VARCHAR(200)   (pii)
  churn_probability DECIMAL(5,4)   (note "From churn_predictor model output")
  lifetime_revenue  DECIMAL(14,2)  (note "Sum of all historical orders from fact_orders")
  risk_tier         VARCHAR(20)    (note "High / Medium / Low based on churn probability and LTV")
}
```

Governance tokens (`classification`, `retention`, `pii`, `owner`) compose naturally with `report` and `source`. Impact analysis can now trace from the `pii` field through to the specific dashboard that displays it.

### 4. Minimal Report

```satsuma
schema daily_order_summary (
  report,
  source {fact_orders},
  note "Simple daily order count and total — emailed to warehouse team each morning"
) {
  report_date   DATE
  order_count   INTEGER
  total_amount  DECIMAL(14,2)
}
```

The simplest useful report: `report`, `source`, a `note`, and a few fields. This is the minimum needed to close the lineage edge from `fact_orders` to its downstream consumer.

## Canonical Example

See [`examples/reports-and-models.stm`](../../examples/reports-and-models.stm) for a full working Satsuma file demonstrating these conventions in context.
