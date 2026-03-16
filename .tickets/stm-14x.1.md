---
id: stm-14x.1
status: closed
deps: []
links: []
created: 2026-03-13T13:46:53Z
type: task
priority: 1
assignee: thorben
parent: stm-14x
---
# Set parser workspace boundaries and CST/AST contract

Create the parser workspace under `tooling/tree-sitter-stm/`, decide in-repo package ownership, add a parser README, write `docs/ast-mapping.md`, and capture the known grammar ambiguity list from `STM-SPEC.md` before rule implementation starts.

## Acceptance Criteria
- `tooling/tree-sitter-stm/` exists with package scaffolding and a README stating parser-only scope.
- `docs/ast-mapping.md` defines canonical CST node names, AST mapping guidance, comment/note attachment strategy, and path representation.
- A written ambiguity list covers map-vs-transform collisions, nested map vs note blocks, `when` header vs continuation lines, and newline-sensitive continuations.
- A short design note documents precedence strategy for paths, tags, annotations, and transform clauses.
- Documentation review is backed by at least one smoke check or fixture reference proving the planned node inventory matches current examples.


## Acceptance Criteria

- `tooling/tree-sitter-stm/` exists with package scaffolding and a README stating parser-only scope.
- `docs/ast-mapping.md` defines canonical CST node names, AST mapping guidance, comment/note attachment strategy, and path representation.
- A written ambiguity list covers map-vs-transform collisions, nested map vs note blocks, `when` header vs continuation lines, and newline-sensitive continuations.
- A short design note documents precedence strategy for paths, tags, annotations, and transform clauses.
- Documentation review is backed by at least one smoke check or fixture reference proving the planned node inventory matches current examples.


