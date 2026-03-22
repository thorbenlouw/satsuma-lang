---
id: sc-v2pn
status: open
deps: []
links: []
created: 2026-03-22T20:17:19Z
type: epic
priority: 1
assignee: Thorben Louw
tags: [syntax, grammar, breaking]
---
# Unified field syntax

Replace keyword-first record/list blocks with name-first unified field syntax. Replace [] mapping syntax with each/flatten keywords. See features/19-unified-field-syntax/PRD.md

## Acceptance Criteria

All fields follow NAME TYPE (meta) {body} pattern. list_of for scalar and record lists. each/flatten replace [] in mappings. All tests, examples, docs updated.

