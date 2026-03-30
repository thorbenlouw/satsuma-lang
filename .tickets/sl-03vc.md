---
id: sl-03vc
status: closed
deps: []
links: []
created: 2026-03-30T18:52:37Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-jvwu
tags: [core, cli]
---
# core: extend labelText() to handle qualified_name for namespace-qualified block labels

context.ts in the CLI has its own getBlockName() that handles qualified_name nodes (e.g. crm::customers) by joining child identifiers with '::'. Core's labelText() only handles identifier and backtick_name — it falls through to null for qualified_name.

Which implementation wins: Core's labelText() should be extended to also handle qualified_name, then context.ts can switch to it.

Work:
1. In core's labelText() (cst-utils.ts): add a qualified_name branch that joins child identifiers with '::'.
2. Add tests for qualified_name labels in core.
3. In CLI context.ts: delete the private getBlockName(), import labelText from @satsuma/core, update callers (collectRawBlockText, collectMetadataText).
4. Consolidate or delete any tests that only tested the CLI's getBlockName().

## Acceptance Criteria

Core labelText() handles qualified_name nodes; context.ts getBlockName() deleted; callers use core labelText(); Core test suite covers qualified_name labels; No consumer duplicates this logic

