; Fold brace-delimited bodies
(schema_body) @fold
(map_body) @fold
(integration_body) @fold
(workspace_body) @fold

; Fold multiline notes
(note_block) @fold
(inline_note_block) @fold

; Fold top-level blocks
(integration_block) @fold
(schema_block) @fold
(map_block) @fold
(workspace_block) @fold
(fragment_block) @fold
