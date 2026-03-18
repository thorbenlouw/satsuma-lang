---
id: stm-89tv
status: open
deps: [stm-xdhb]
links: []
created: 2026-03-18T10:46:34Z
type: task
priority: 2
assignee: Thorben Louw
tags: [vscode-v2]
---
# Implement v2 operator and vocabulary token patterns

Add TextMate patterns for operators: -> arrow, | pipe, ... spread, : key-value separator, [] array indicator. Add vocabulary token patterns for known tokens in () metadata context (pk, required, unique, indexed, pii, encrypt, enum, default, format, ref, xpath, namespace, filter, note) and {} pipeline context (trim, lowercase, uppercase, coalesce, round, split, first, last, to_utc, etc.). Add type name patterns for common data types (VARCHAR, INT, UUID, etc.) with parameterized forms.

