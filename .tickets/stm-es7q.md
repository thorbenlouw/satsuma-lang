---
id: stm-es7q
status: closed
deps: []
links: []
created: 2026-03-18T18:57:00Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-q2cz
tags: [parser, tree-sitter, pipelines]
---
# Extend pipeline grammar for arithmetic steps and richer token-call args

Support arithmetic pipeline steps and token-call arguments such as dotted secret paths and algorithm identifiers.

## Acceptance Criteria

Corpus tests cover coalesce(0) | * 100 | round and encrypt(AES-256-GCM, secrets.tax_encryption_key).
The grammar parses examples/db-to-db.stm without recovery errors from those pipeline constructs.

