---
id: sl-3lfu
status: closed
deps: [sl-u31z, sl-teg4, sl-ax50, sl-yml8, sl-i9pt, sl-ueij, sl-yumm, sl-yjga, sl-hnbv]
links: []
created: 2026-03-30T06:39:43Z
type: epic
priority: 2
assignee: Thorben Louw
---
# epic: readability and literate programming audit — tooling codebase

The satsuma-lang tooling codebase is intended to be a teaching example of how to build a tree-sitter-backed language toolchain. A readability audit identified specific defects across core, CLI, and LSP packages: magic constants without explanation, long undocumented functions, business rules buried as anonymous values, and complex algorithms with no orientation comment.

This epic tracks the targeted fixes. Each child ticket addresses a specific file or function. The goal is a codebase where a capable developer unfamiliar with the system can read any file and understand what it does, why it exists, and how it fits the whole — without needing to ask.

## Acceptance Criteria

- All child tickets closed
- No file in tooling/ has a function over ~40 lines without sectional comments or decomposition
- No exported type has undocumented fields
- No magic constant is anonymous — every non-obvious value has a name and a comment
- Business rules (conventions, known values, column caps) are labelled and citable

