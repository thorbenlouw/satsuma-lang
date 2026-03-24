---
id: sl-5ttm
status: open
deps: []
links: []
created: 2026-03-24T22:14:16Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-98xk
tags: [docs, feature-21, tutorial]
---
# Data Engineer Tutorial (D6)

Write docs/tutorials/data-engineer-tutorial.md covering Satsuma + AI workflow for pipeline scaffold generation, data quality tests, sample data, and governance metadata. See PRD D6 for 10-section outline.

## Acceptance Criteria

1. docs/tutorials/data-engineer-tutorial.md exists and covers all 10 sections from PRD D6
2. Covers scaffold generation descriptions (not detailed code) for: Databricks DLT, Snowflake+dbt, Airflow, ADF, Logic Apps, PySpark
3. Covers data quality test generation patterns for: Great Expectations, SodaSQL, dbt tests
4. Covers sample test data generation from Satsuma metadata
5. Covers governance metadata generation (OpenLineage, data catalogs)
6. Includes section on why Satsuma produces better AI results than loose specs
7. Includes human verification and LLM-as-judge patterns
8. Cross-references BA tutorial, convention docs, CLI reference, and using-without-cli doc
9. Tone matches BA tutorial: conversational, practical, incremental, brief Satsuma snippets
10. site/learn.html Data Engineers section links to the tutorial (already done)

