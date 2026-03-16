---
id: stm-14x
status: closed
deps: []
links: []
created: 2026-03-13T13:46:53Z
type: feature
priority: 1
---
# Tree-sitter parser for STM

Build an in-repo `tree-sitter-stm` parser that covers STM v1.0.0 syntax and exposes a stable CST foundation for linting, formatting, visualization, and editor tooling.

## Acceptance Criteria
- A `tooling/tree-sitter-stm/` package exists and is owned by this repo.
- The parser covers the STM v1.0.0 syntax required by `STM-SPEC.md` and the canonical `examples/` corpus.
- CST node naming and AST mapping guidance are documented for downstream consumers.
- Corpus, fixture, and recovery tests provide strong coverage across valid and invalid syntax.
- CI runs parser generation/tests and parses every example `.stm` file successfully.


## Acceptance Criteria

- A `tooling/tree-sitter-stm/` package exists and is owned by this repo.
- The parser covers the STM v1.0.0 syntax required by `STM-SPEC.md` and the canonical `examples/` corpus.
- CST node naming and AST mapping guidance are documented for downstream consumers.
- Corpus, fixture, and recovery tests provide strong coverage across valid and invalid syntax.
- CI runs parser generation/tests and parses every example `.stm` file successfully.


