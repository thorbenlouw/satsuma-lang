---
id: stm-0z5
status: closed
deps: []
links: []
created: 2026-03-13T15:58:30Z
type: feature
priority: 1
---
# Multi-schema namespace and workspace support

Add grammar-enforced namespace scoping and workspace blocks to STM, enabling platform-wide lineage across multiple integration files.

## Problem
- No way to stitch multiple .stm files into a lineage graph
- Same-named schemas in different logical projects (e.g. `orders` in crm vs billing) are ambiguous

## Solution
1. File-level `namespace` declaration scopes all schemas in a file to a named prefix
2. `::` path separator (e.g. `crm::orders.field`) avoids collision with existing `.field.nested` syntax
3. `workspace` block assembles multiple integration files into a platform scope — entry point for lineage tooling

## Acceptance Criteria
- [ ] STM-SPEC.md updated: namespace declaration, :: path syntax, workspace block, scoping rules, grammar EBNF
- [ ] tree-sitter grammar.js updated to parse all new constructs without ambiguity
- [ ] Example files cover: single-file namespace, workspace assembly, cross-namespace map blocks
- [ ] docs/ast-mapping.md updated with new node types
- [ ] Backwards compatible: files without namespace unchanged, aliased imports still work
- [ ] Parser errors on: duplicate namespace clash, workspace/file namespace mismatch


