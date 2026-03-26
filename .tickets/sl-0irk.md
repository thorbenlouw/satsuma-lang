---
id: sl-0irk
status: closed
deps: []
links: []
created: 2026-03-26T07:06:56Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [lsp, vscode, feature-22]
---
# VSCode diagnostics underline backtick refs instead of @refs

The LSP server's hidden-source-in-nl diagnostic still underlines backtick-delimited references in NL strings rather than @ref mentions. Now that examples have been migrated to @ref syntax, the diagnostic highlighting needs to target @ref spans instead of (or in addition to) backtick spans. The underlying extraction (nl-ref-extract.ts) was already updated to detect @refs, but the LSP diagnostic range calculation likely still points at backtick positions.

## Acceptance Criteria

- hidden-source-in-nl diagnostic underlines @ref mentions, not backtick refs
- Diagnostic range correctly spans the @ref token (e.g. @crm_system)
- Existing backtick ref underlining still works for backward compat
- LSP tests updated to cover @ref diagnostic ranges


## Notes

**2026-03-26T07:15:18Z**

Updated semantic-tokens.ts to detect @ref patterns (AT_REF_RE) in NL strings alongside backtick refs. Split tokenization now emits variable tokens with nlRef modifier for both @ref and backtick spans. 2 new tests added.
