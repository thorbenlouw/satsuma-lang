---
id: stm-6lq1
status: open
deps: [stm-6siu, stm-9h3g, stm-ohgr]
links: []
created: 2026-03-18T12:17:55Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-a07c
tags: [treesitter, parser]
---
# Phase 6: Mapping blocks

Parse mapping blocks with source_block, target_block, note_block, arrow_decl. Arrow types: map_arrow, computed_arrow, nested_arrow. Path types: dotted, array, relative, backtick, namespaced. pipe_chain and pipe_step (nl_string, token_call, bare_token, map_literal, fragment_spread). map_literal with map_entry, map_key, map_value. Add corpus files: mappings.txt, arrows.txt, transforms_in_arrows.txt, value_maps.txt, nested_arrows.txt.

## Acceptance Criteria

- All mapping block components parse correctly
- All arrow types work
- All path types work
- pipe_chain and map_literal work
- All 5 corpus files pass

