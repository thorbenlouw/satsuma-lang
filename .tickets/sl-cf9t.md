---
id: sl-cf9t
status: closed
deps: []
links: []
created: 2026-03-31T08:29:54Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, namespace, import, exploratory-testing]
---
# namespace/import: transitive imports are visible — spec says imports are not re-exported

The CLI makes transitively imported symbols visible, violating the spec's import scoping rules. Section 5.3 states: 'Imports are not re-exported: if file A imports X from file B, a third file C must import X directly from B.'

Repro:
  # base.stm defines 'my_transform'
  # middle.stm: import { my_transform } from './base.stm'
  # top.stm: import { middle_schema } from './middle.stm'  (does NOT import my_transform)
  # top.stm uses my_transform in a mapping arrow
  cd /tmp/satsuma-test-ns-import/transitive
  satsuma validate top.stm
  # Output: Validated 3 files: no issues found.

Expected: validate should report that my_transform is not in scope (not imported by top.stm).

This also affects fragment spreads: a file can use ...base_fields from a transitively imported file without importing it directly. The CLI treats the entire transitive import graph as a flat scope.

## Notes

**2026-03-31**

Closed — not a bug. The spec was wrong, not the CLI. Imports ARE transitive by design, and imported symbols ARE re-exported. The spec (section 5.3) will be updated to reflect the actual intended semantics. See ADR-022.

