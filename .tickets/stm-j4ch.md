---
id: stm-j4ch
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
# Implement stm meta command

New command: stm meta <scope>. Extracts metadata entries (tags, key-value pairs, enums, notes, type) for a block or field. Scope: schema <name>, field <schema.field>, mapping <name>, metric <name>.

## Acceptance Criteria

- [ ] Create src/meta-extract.js: extracts structured metadata from metadata CST nodes
- [ ] Parses into: tags (standalone tokens), key-value pairs, enum bodies, note strings
- [ ] For fields: also includes the type string
- [ ] Scope argument: schema <name>, field <schema.field>, mapping <name>, metric <name>
- [ ] --tags-only: just tag tokens, one per line
- [ ] --json structured metadata object
- [ ] Exit 1 if scope not found
- [ ] Tests: schema metadata extracts note and tags
- [ ] Tests: field metadata extracts type, tags, enum values, key-value pairs
- [ ] Tests: --tags-only returns just tokens

