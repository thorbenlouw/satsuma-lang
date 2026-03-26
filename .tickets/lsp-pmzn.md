---
id: lsp-pmzn
status: closed
deps: [lsp-vm73]
links: []
created: 2026-03-25T17:29:21Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-3, cli]
---
# P3.6: Update meta-extract.ts for simplified grammar

Update metadata extraction to handle tag_with_value instead of key_value_pair with 13 child types.

## Acceptance Criteria

- Extracts tag name and value text from tag_with_value nodes
- enum_body, slice_body, note_tag still extracted as structured
- All meta-extract tests pass


## Notes

**2026-03-26T01:14:25Z**

**2026-03-26T16:20:00Z**

Cause: CLI code referenced removed CST node types.
Fix: Already completed in P3.1/P3.2 commits. meta-extract.ts uses tag_with_value, classify.ts uses pipe_text with NL child detection, extract.ts updated for all new node types. All 817 CLI tests pass.
