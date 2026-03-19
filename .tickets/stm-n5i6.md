---
id: stm-n5i6
status: open
deps: []
links: []
created: 2026-03-19T07:38:38Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, coverage, tree-sitter]
---
# stm fields --unmapped-by reports nested target list as unmapped

Reproduced against examples/sap-po-to-mfcs.stm.

Observed behavior:
- `node tooling/stm-cli/src/index.js mapping 'sap po to mfcs' examples/sap-po-to-mfcs.stm --json` reports a nested mapping arrow with `src: "Items[]"` and `tgt: "items[]"`.\n- `node tooling/stm-cli/src/index.js fields mfcs_purchase_order --unmapped-by 'sap po to mfcs' examples/sap-po-to-mfcs.stm --json` still returns the top-level target list field `items` as unmapped.\n\nWhy this is a bug:\n- The target list container is structurally mapped by the nested arrow, so coverage output should not classify it as unmapped.\n- This makes coverage checks misleading for nested list targets and can cause agents or humans to think a mapped collection is missing.\n\nReproduction:\n1. Open `examples/sap-po-to-mfcs.stm`.\n2. Confirm the mapping contains `Items[] -> items[] (...) { ... }`.\n3. Run: `node tooling/stm-cli/src/index.js fields mfcs_purchase_order --unmapped-by 'sap po to mfcs' examples/sap-po-to-mfcs.stm --json`\n4. Observe that the result includes the `items` list field.\n5. Run: `node tooling/stm-cli/src/index.js mapping 'sap po to mfcs' examples/sap-po-to-mfcs.stm --json`\n6. Observe that the mapping output includes a nested arrow for `Items[] -> items[]`.\n\nActual result:\n- `fields --unmapped-by` reports `items` as unmapped.\n\nExpected result:\n- A target list field should count as mapped when a nested arrow targets that list, even if child fields are populated inside the nested block.\n- If the command intentionally distinguishes container coverage from child coverage, that distinction needs to be represented explicitly rather than calling the list unmapped.

## Acceptance Criteria

- Add a regression test covering a target schema with a nested list mapped by `src[] -> tgt[] { ... }`.
- `fields <target> --unmapped-by <mapping>` must not report the target list container as unmapped when the mapping contains a nested arrow to that list.
- The fix must preserve existing unmapped reporting for genuinely unmapped top-level fields and genuinely unmapped nested children.
- Document the intended coverage semantics for nested list containers if any edge-case behavior remains.

