---
id: sl-w18x
status: open
deps: []
links: []
created: 2026-03-24T22:15:04Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-98xk
tags: [docs, feature-21, convention]
---
# Reports and ML models convention docs (D4)

Write docs/conventions-for-reports-and-models/ with README.md and LLM-Guidelines.md. Token dictionary for report, model, source, tool, refresh schedule, registry metadata on schemas. Add canonical example examples/reports-and-models.stm. See PRD D4.

## Acceptance Criteria

1. docs/conventions-for-reports-and-models/README.md exists with convention guide
2. docs/conventions-for-reports-and-models/LLM-Guidelines.md exists with interpretation rules
3. Token dictionary covers: report, model, source {schemas}, tool, refresh schedule, registry
4. Covers patterns: dashboard with dependencies+schedule, ML model with features+output+registry, report with governance tokens, minimal report
5. examples/reports-and-models.stm exists, demonstrates all patterns, parses clean with satsuma validate
6. LLM guidance covers: lineage leaf nodes, source→edges mapping, dependency docs generation, composition with governance tokens
7. HOW-DO-I.md reports section links updated from placeholder to real links

