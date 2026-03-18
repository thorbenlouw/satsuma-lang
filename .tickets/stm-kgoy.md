---
id: stm-kgoy
status: closed
deps: [stm-120o]
links: []
created: 2026-03-18T12:17:55Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-a07c
tags: [treesitter, parser]
---
# Phase 11: Smoke-test script

Write scripts/smoke-test.js: accepts .stm file, parses with tree-sitter binding, emits JSON summary (schemas, metrics, mappings, fragments, transforms, warnings, questions). Run against all examples/*.stm with no parse errors.

## Acceptance Criteria

- smoke-test.js produces valid JSON for all example files
- All examples/*.stm parse with zero errors
- JSON includes schemas, metrics, mappings, fragments, transforms, warnings, questions

