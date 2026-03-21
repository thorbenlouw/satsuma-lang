---
id: sl-3nrg
status: closed
deps: []
links: [sl-jt7q]
created: 2026-03-21T08:03:28Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, nl, exploratory-testing]
---
# nl: record_block and list_block notes attributed to enclosing schema instead of record/list name

When a record or list block has a note (inline or comment), satsuma nl attributes it to the enclosing schema instead of the record/list block name. This makes it impossible to distinguish which nested structure a note belongs to.

- What I did: satsuma nl nested_test /tmp/satsuma-test-nl/record-list-notes.stm --json
- Expected: The note "Address record note" should have parent: "address", and "Contacts list note" should have parent: "contacts". Comments inside record/list blocks should also use the record/list name as parent.
- Got: All record/list-level notes and comments have parent: "nested_test" (the enclosing schema name).
- Root cause: nl-extract.ts walkNL() only sets newParent for schema_block, mapping_block, metric_block, fragment_block, and field_decl. It does not handle record_block or list_block, so their NL content inherits the enclosing schema as parent.
- Reproducer: /tmp/satsuma-test-nl/record-list-notes.stm

