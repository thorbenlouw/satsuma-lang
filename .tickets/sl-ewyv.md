---
id: sl-ewyv
status: closed
deps: []
links: []
created: 2026-03-30T18:22:44Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-jvwu
tags: [cli]
---
# cli: replace getBlockName() with core labelText() in nl-extract.ts and cst-query.ts

getBlockName() appears twice in the CLI: as a private function in nl-extract.ts and as an exported function in cst-query.ts. Both extract text from a block_label CST node — identical to core's labelText() in cst-utils.ts.

**Which implementation wins:** Core's labelText() — it's the canonical version and already exported.

**Work:**
1. In cst-query.ts: delete getBlockName(), import labelText from @satsuma/core/cst-utils, update all callers (findBlockNode, findBlockByRow, findBlockNodeInContainer) to use labelText().
2. In nl-extract.ts: delete the private getBlockName(), replace the call site with an import of labelText from core.
3. Verify getFieldName() in nl-extract.ts doesn't also duplicate core logic (it extracts from field_name children — check if entryText() covers this).
4. Consolidate or delete any tests that only tested getBlockName() — core already tests labelText().

**Validation before PR:**
- All CLI tests pass
- No remaining getBlockName definitions in CLI codebase (grep to confirm)
- Code meets AGENTS.md standards: no orphan imports, no dead code

## Acceptance Criteria

- getBlockName() deleted from both nl-extract.ts and cst-query.ts
- All callers use core labelText()
- No redundant tests for block name extraction in CLI


## Notes

**2026-03-30T18:45:55Z**

Cause: getBlockName() was duplicated in cst-query.ts (exported) and nl-extract.ts (private), both identical to core's labelText().
Fix: Deleted both copies, imported labelText from @satsuma/core in cst-query.ts, nl-extract.ts, and commands/nl.ts. getFieldName() in nl-extract.ts was checked — it navigates to field_name child first, which entryText() does not do (entryText works on the node directly), so it remains as-is. Note: context.ts still has its own getBlockName() that additionally handles qualified_name — this is out of scope as it has different logic than the simple labelText(). All 862 CLI tests pass.
