; ── STM v2 Fold Ranges ────────────────────────────────────────────────────────
; queries/folds.scm
;
; Editors use these captures to determine which nodes can be collapsed.
; Each block type is foldable on its { } body.

; Top-level block types
(schema_block) @fold
(fragment_block) @fold
(transform_block) @fold
(mapping_block) @fold
(metric_block) @fold

; Structural note blocks
(note_block) @fold

; Nested blocks within schema bodies
(record_block) @fold
(list_block) @fold

; Metadata blocks ( ) — useful for multi-line metadata
(metadata_block) @fold

; Nested arrow bodies within mappings
(nested_arrow) @fold

; Map literals in transforms and arrow bodies
(map_literal) @fold
