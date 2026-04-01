---
id: sjsr-01ad
status: closed
deps: []
links: []
created: 2026-04-01T10:35:47Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [lsp, vscode, validate, exploratory-testing]
---
# lsp: quoted join descriptions in source blocks produce false undefined-source warnings

Opening `examples/filter-flatten-governance/filter-flatten-governance.stm` in the VS Code extension produced a warning on mapping `completed orders` that treated the quoted join description inside `source {}` as an undefined source.

**Expected:** The quoted join/filter prose is documentation, not a structural schema reference. It should not be indexed as a source ref and should not trigger undefined-source or missing-import diagnostics.

**Actual:** The LSP path indexed the quoted join description as a source reference, producing a false warning even though the CLI validated the file cleanly.

**Reproducer:** Open `examples/filter-flatten-governance/filter-flatten-governance.stm` in the VS Code extension and inspect mapping `completed orders`.

## Acceptance Criteria

- Quoted join descriptions inside `source {}` are ignored as structural source refs
- `examples/filter-flatten-governance/filter-flatten-governance.stm` produces no undefined-source warning for mapping `completed orders`
- Workspace indexing, missing-import diagnostics, and core semantic diagnostics agree on this rule
- Add regression coverage in core and LSP tests for quoted join descriptions in source blocks


## Notes

**2026-04-01T10:36:51Z**

Cause: The LSP workspace index treated quoted join descriptions inside `source {}` as structural `source_ref` names, so VS Code emitted false undefined-source and missing-import diagnostics even though the CLI extractor ignored those NL strings.
Fix: Added a structural-only source-ref extractor in core, switched LSP source/target indexing to use it, and added regression tests for workspace indexing and diagnostics. Also scoped merged core semantic diagnostics to the active import graph.
