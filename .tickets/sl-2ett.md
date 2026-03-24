---
id: sl-2ett
status: closed
deps: []
links: []
created: 2026-03-24T22:14:45Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-98xk
tags: [docs, feature-21, convention]
---
# Governance metadata convention docs (D2)

Write docs/conventions-for-governance/ with README.md and LLM-Guidelines.md. Token dictionary for owner, steward, retention, classification, mask, compliance, and org-extensible tokens. Add canonical example examples/governance.stm. See PRD D2.

## Acceptance Criteria

1. docs/conventions-for-governance/README.md exists with convention guide
2. docs/conventions-for-governance/LLM-Guidelines.md exists with interpretation rules
3. Token dictionary covers schema-level (owner, steward, retention, compliance) and field-level (classification, mask, pii, encrypt) tokens
4. Covers patterns: field-level PII+classification+masking, schema-level ownership, retention policies, multi-framework compliance, custom org-specific tokens
5. examples/governance.stm exists, demonstrates all patterns, parses clean with satsuma validate
6. References existing examples/filter-flatten-governance.stm which already uses classification and retention
7. LLM guidance covers: security policy generation, retention DDL, pii+classification+encrypt composition, governance completeness validation, org token extensibility
8. HOW-DO-I.md governance section links updated from placeholder to real links

