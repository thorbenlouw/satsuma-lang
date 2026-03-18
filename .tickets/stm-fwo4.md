---
id: stm-fwo4
status: closed
deps: [stm-iohm]
links: []
created: 2026-03-18T16:52:43Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u32p
tags: [cli, feature-10]
---
# Implement stm nl command

New command: stm nl <scope>. Extracts all NL content (notes, transforms, comments) within a scope, with structural position info. Scope: schema <name>, mapping <name>, field <schema.field>, or all.

## Acceptance Criteria

- [ ] Create src/nl-extract.js: walks CST subtree, collects nl_string, multiline_string, note_block, note_tag, warning_comment, question_comment nodes
- [ ] Each item includes: raw text, position type (block note, field note, transform step, warning, question), parent block/field name
- [ ] Scope argument: schema <name>, mapping <name>, field <schema.field>, all
- [ ] --kind <type> filters to note, warning, question, or transform
- [ ] --json structured output with position info
- [ ] Exit 1 if scope not found
- [ ] Tests: schema scope extracts schema-level and field-level notes
- [ ] Tests: mapping scope extracts NL transform bodies and mapping notes
- [ ] Tests: field scope extracts just that field's NL content
- [ ] Tests: --kind transform filters correctly

