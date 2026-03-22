---
id: sl-9uh0
status: closed
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


## Notes

**2026-03-22T08:13:10Z**

**2026-03-22T08:25:00Z**

Cause: The tree-sitter grammar's relative_field_path (and other path rules) used `repeat(seq(".", _path_seg))` for multi-segment paths. Since newlines are in the grammar's `extras`, the continuation dot could match across line boundaries, causing `.A -> .x\n    .B -> .y` to parse `.x\n    .B` as a single multi-segment target path.
Fix: Changed all path continuation dots to `token.immediate(".")` in grammar.js so the dot must immediately follow the previous path segment with no whitespace/newlines. Also updated cleanPathText comment in extract.ts. Added 2 corpus tests and 2 CLI tests.
