; ── STM v2 Locals (scopes, definitions, references) ──────────────────────────
; queries/locals.scm
;
; Used by language servers and tree-sitter-based tools to track where names
; are defined and referenced within and across STM files.

; ── Scope boundaries ─────────────────────────────────────────────────────────
; Each top-level block introduces its own scope.
(schema_block) @local.scope
(fragment_block) @local.scope
(transform_block) @local.scope
(mapping_block) @local.scope
(metric_block) @local.scope

; ── Name definitions ─────────────────────────────────────────────────────────
; Block labels are the canonical definition points for named constructs.
(schema_block (block_label) @local.definition)
(fragment_block (block_label) @local.definition)
(transform_block (block_label) @local.definition)
(mapping_block (block_label) @local.definition)
(metric_block (block_label) @local.definition)

; ── References ────────────────────────────────────────────────────────────────
; Fragment spreads reference fragment (or named transform) labels.
(fragment_spread (spread_label) @local.reference)

; Source/target entries reference schema names.
; Backtick refs are the canonical way to reference a schema by name in
; source/target blocks and path expressions.
(source_block (source_ref (backtick_name) @local.reference))
(target_block (source_ref (backtick_name) @local.reference))

; Backtick names in path expressions reference field/column names.
(backtick_path (backtick_name) @local.reference)
(field_decl (field_name (backtick_name)) @local.definition)

; Import declarations reference external file paths.
(import_decl
  (import_name (quoted_name) @local.reference)
  (import_path (nl_string) @local.reference))
