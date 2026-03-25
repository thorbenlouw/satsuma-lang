---
id: lsp-pmzn
status: open
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

