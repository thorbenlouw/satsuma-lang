---
id: sl-9uh0
status: open
deps: []
links: []
created: 2026-03-22T07:44:22Z
type: bug
priority: 0
assignee: Thorben Louw
parent: sl-3alz
tags: [cli, mapping, extract, exploratory-testing-2]
---
# mapping: nested arrow bare children get target-contaminated

In nested arrow blocks (e.g., Items[] -> items[] { ... }), bare arrows without a transform body get their target text merged with the next arrow's source field. Only the first child retains its source; subsequent bare arrows become derived/computed.

## Reproduction

Given this .stm file:

```stm
schema src { id INTEGER }
schema tgt { id INTEGER }

mapping 'three arrows' {
  source { `src` }
  target { `tgt` }
  Items[] -> items[] {
    .A -> .x
    .B -> .y
    .C -> .z { trim }
  }
}
```

Run: `satsuma mapping 'three arrows' <file> --json`

Expected children:
- src='.A' tgt='.x' kind=map
- src='.B' tgt='.y' kind=map
- src='.C' tgt='.z' kind=map, transform='trim'

Actual children:
- src='.A' tgt='.x\n    .B' kind=map (target contaminated with next source)
- src='(derived)' tgt='.y\n    .C' kind=computed (should be map with src='.B')
- src='(derived)' tgt='.z' kind=computed, transform='trim' (should be map with src='.C')

Arrows WITH transform bodies are not affected — the issue only hits bare arrows within nested blocks.

## Affected canonical example

examples/sap-po-to-mfcs.stm: `.EINDT -> .needByDate` gets target contaminated with `.TXZ01`, and `.TXZ01 -> .description` becomes derived.

## Impact

High — data integrity issue. Arrow source/target attribution is wrong in nested blocks, causing incorrect lineage and graph edges.

