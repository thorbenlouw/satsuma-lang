---
id: stm-5lbl
status: open
deps: [stm-o50b]
links: []
created: 2026-03-16T13:46:54Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-t1n8
---
# Design parser-backed semantic highlighting follow-on for STM

Document the post-MVP plan for semantic tokens layered on top of the TextMate grammar using the STM parser or future language server so the project has a clear path beyond regex-only highlighting.

## Acceptance Criteria

The design note identifies which highlighting gaps require semantic tokens rather than more TextMate patterns.
The note compares extension-host parser integration versus future LSP delivery at a practical level.
Dependency gates are defined in terms of parser stability, CST-to-AST mapping, and reusable parser boundaries.
The layering model is explicit: semantic tokens augment baseline TextMate scopes rather than replace them.
Open implementation risks and assumptions are captured for future work.

