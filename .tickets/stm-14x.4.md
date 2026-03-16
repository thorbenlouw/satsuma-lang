---
id: stm-14x.4
status: closed
deps: [stm-14x.3]
links: []
created: 2026-03-13T13:46:54Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-14x
---
# Implement core map block and entry grammar

Implement map headers with optional source/target schemas and options, plus direct entries, computed entries, nested map blocks, and map-entry note attachments. Keep grammar boundaries explicit around the main ambiguity hotspots.

## Acceptance Criteria
- `map` headers support optional `source -> target` pairs and bracketed options such as `flatten`, `group_by`, and header-level `when` where allowed by the spec.
- Map entries support direct `src -> tgt`, computed `=> tgt`, and nested `src[] -> tgt[] { ... }` forms.
- Map-entry note blocks are structurally recoverable and do not conflict with nested map blocks.
- Targeted ambiguity tests cover `map { ... }` as a transform/value-map versus `map ... { ... }` as a block, plus keyword collision cases called out in the PRD.
- Valid and malformed map fixtures prove the grammar keeps enough structure for downstream AST extraction.


## Acceptance Criteria

- `map` headers support optional `source -> target` pairs and bracketed options such as `flatten`, `group_by`, and header-level `when` where allowed by the spec.
- Map entries support direct `src -> tgt`, computed `=> tgt`, and nested `src[] -> tgt[] { ... }` forms.
- Map-entry note blocks are structurally recoverable and do not conflict with nested map blocks.
- Targeted ambiguity tests cover `map { ... }` as a transform/value-map versus `map ... { ... }` as a block, plus keyword collision cases called out in the PRD.
- Valid and malformed map fixtures prove the grammar keeps enough structure for downstream AST extraction.


