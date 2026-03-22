---
id: sc-v2pn
status: closed
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


## Notes

**2026-03-22T21:19:58Z**

**2026-03-23T00:35:00Z**

Cause: Satsuma v2 had inconsistent keyword-first record/list blocks and [] path syntax.
Fix: Complete unified field syntax migration across the entire repo:
- Grammar: NAME TYPE (meta) {body} pattern, each/flatten blocks, no []
- Parser: 241 corpus tests (15 new), regenerated artifacts
- Examples: 7 files migrated, all 17 parse cleanly
- CLI: extract.ts, 6 command files, spread-expand.ts updated; 624 tests pass
- VS Code: TextMate grammar updated for record/list_of/each/flatten
- Docs: Spec, agent reference, 35+ doc files updated
All 13 subtasks closed.
