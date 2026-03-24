---
id: sl-dm3p
status: open
deps: []
links: []
created: 2026-03-24T22:14:37Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-98xk
tags: [docs, feature-21, convention]
---
# Merge/upsert strategy convention docs (D1)

Write docs/conventions-for-merge-strategy/ with README.md and LLM-Guidelines.md. Token dictionary for merge upsert/append/soft_delete/full_refresh plus match_on/on_match/on_no_match. Add canonical example examples/merge-strategies.stm. See PRD D1.

## Acceptance Criteria

1. docs/conventions-for-merge-strategy/README.md exists with convention guide
2. docs/conventions-for-merge-strategy/LLM-Guidelines.md exists with interpretation rules for codegen
3. Token dictionary table covers: merge upsert, merge append, merge soft_delete, merge full_refresh, match_on, on_match, on_no_match, delete_flag, delete_timestamp
4. Covers patterns: upsert, append-only, soft delete, full refresh, composite match keys
5. examples/merge-strategies.stm exists, demonstrates all four patterns, parses clean with satsuma validate
6. LLM guidance covers: platform-specific MERGE/INSERT/UPDATE/DELETE generation, defaults, interaction with scd tokens, validation rules
7. HOW-DO-I.md load strategy section links updated from placeholder to real links

