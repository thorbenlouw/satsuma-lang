---
id: stm-14x.3
status: closed
deps: [stm-14x.2]
links: []
created: 2026-03-13T13:46:54Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-14x
---
# Parse schema, fragment, and integration bodies

Implement integration fields, schema/fragment members, field declarations, primitive arrays, groups, array groups, spreads, tags, enum sets, annotations, and inline note attachments. Preserve enough structure for symbol indexing and AST building.

## Acceptance Criteria
- Integration fields and schema/fragment bodies parse into stable nodes for fields, groups, spreads, tags, annotations, and note blocks.
- Field syntax supports optional `[]`, parameterized types, tag lists, enum value sets, and postfix annotations.
- Group syntax supports nested groups and array groups without collapsing structure needed by downstream tooling.
- Corpus tests cover every schema construct named in `features/01-treesitter-parser/TODO.md`, including arrays of primitives vs arrays of groups and fragment spreads.
- Tests include malformed body cases for broken tag lists, incomplete annotations, and unterminated inline notes with useful recovery assertions.


## Acceptance Criteria

- Integration fields and schema/fragment bodies parse into stable nodes for fields, groups, spreads, tags, annotations, and note blocks.
- Field syntax supports optional `[]`, parameterized types, tag lists, enum value sets, and postfix annotations.
- Group syntax supports nested groups and array groups without collapsing structure needed by downstream tooling.
- Corpus tests cover every schema construct named in `features/01-treesitter-parser/TODO.md`, including arrays of primitives vs arrays of groups and fragment spreads.
- Tests include malformed body cases for broken tag lists, incomplete annotations, and unterminated inline notes with useful recovery assertions.

## Notes

Completed implementation:
- Replaced generic schema/integration body parsing with explicit nodes for integration fields, field declarations, groups, array groups, fragment spreads, tag lists, enum value sets, annotations, and inline field notes.
- Added corpus coverage for schema members, integration metadata, fragment spreads, and malformed tag/annotation recovery.
- `tree-sitter test` and `npm test` now pass with the expanded schema-body suite.


