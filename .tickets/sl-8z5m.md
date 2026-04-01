---
id: sl-8z5m
status: closed
deps: []
links: []
created: 2026-04-01T10:05:06Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [vscode, lsp, viz, coverage, exploratory-testing]
---
# viz: mapping detail source usage marker stays unfilled for nested source fields

In the mapping detail view for `completed orders` in `examples/filter-flatten-governance/filter-flatten-governance.stm`, nested source fields are resolved correctly for hover/highlight but are not marked as used in the source schema card.

**What I did:**
Opened the `completed orders` mapping detail view in the VS Code extension and hovered the `customer.email -> customer_email` mapping row.

**Expected:**
The nested source field `customer.email` is marked as used in the source schema card with the same filled indicator used for covered source fields, because the mapping row and hover state already resolve that nested path successfully.

**Actual:**
The mapping detail view highlights `customer.email` correctly during hover, but the source schema card still shows the nested child field as unused (empty circle). Top-level usage appears to work; nested child-field usage does not.

This makes the mapping detail view internally inconsistent: nested field resolution works for interaction, but the usage/coverage marker does not reflect that same resolved path.

**Reproducer:**
1. Open `examples/filter-flatten-governance/filter-flatten-governance.stm` in the VS Code extension.
2. Open the mapping detail view for `completed orders`.
3. Hover the `customer.email -> customer_email` row.
4. Observe that `customer.email` is highlighted/resolved, but the source-side usage marker for the nested child field remains unfilled.

## Acceptance Criteria

- In the mapping detail view, nested source fields used by an arrow are marked as used in the source schema card, not just top-level fields
- The `completed orders` reproducer marks `customer.email` as used when viewing the mapping detail for `customer.email -> customer_email`
- Source usage state is derived from the same resolved nested field path logic used by hover/highlight, or an equivalent shared coverage path, so the two views cannot drift
- Add regression coverage for nested source-field usage in the relevant LSP/extension/viz tests
- Existing top-level source usage markers continue to behave unchanged


## Notes

**2026-04-01T10:18:08Z**

Cause: The mapping detail view and overview cards tracked mapped fields by leaf name only, so nested paths like `customer.email` never marked `customer`/`customer.email` as covered. The viz layer had drifted from the shared coverage semantics already used elsewhere.
Fix: Added shared core coverage-path helpers and rewired satsuma-viz to build path-based covered-field sets per schema, resolve schema-local field paths for multi-source mappings, and render schema-card usage/highlight state by full dotted path. Also added regression tests in core and satsuma-viz, and rebuilt the LSP/extension bundles.
