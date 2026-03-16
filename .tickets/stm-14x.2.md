---
id: stm-14x.2
status: closed
deps: [stm-14x.1]
links: []
created: 2026-03-13T13:46:53Z
type: task
priority: 1
assignee: thorben
parent: stm-14x
---
# Bootstrap lexer and top-level grammar skeleton

Bootstrap the Tree-sitter grammar files and implement the lexical layer plus top-level declarations: `import`, `integration`, schema-family blocks, `fragment`, and `map`. Include tokens for keywords, punctuation, identifiers, backtick identifiers, strings, numbers, STM comment prefixes, and multiline note blocks.

## Acceptance Criteria
- The grammar builds successfully and parses a `source_file` containing imports, integration blocks, schema-family blocks, fragments, and map blocks in arbitrary top-level order.
- Tokens exist for identifiers, backtick identifiers, strings, numbers, `//`, `//!`, `//?`, and `note` triple-quoted bodies.
- Corpus tests cover each supported top-level declaration plus lexical edge cases such as escaped backticks and unterminated note recovery.
- Generated parser artifacts are committed or documented according to repo conventions.
- Tests fail on regressions in tokenization or top-level declaration parsing.


## Acceptance Criteria

- The grammar builds successfully and parses a `source_file` containing imports, integration blocks, schema-family blocks, fragments, and map blocks in arbitrary top-level order.
- Tokens exist for identifiers, backtick identifiers, strings, numbers, `//`, `//!`, `//?`, and `note` triple-quoted bodies.
- Corpus tests cover each supported top-level declaration plus lexical edge cases such as escaped backticks and unterminated note recovery.
- Generated parser artifacts are committed or documented according to repo conventions.
- Tests fail on regressions in tokenization or top-level declaration parsing.

## Notes

Progress update:
- Replaced the placeholder grammar with a line-oriented top-level parser skeleton.
- Added lexical tokens for identifiers, backtick identifiers, strings, numbers, comments, and multiline notes.
- Added corpus files for top-level declarations and lexical edge cases.
- `npm run generate` succeeds locally.
- `tree-sitter test` is currently blocked in this environment because macOS Command Line Tools are not installed/configured (`xcode-select` failure during parser compilation).


