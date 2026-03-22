---
id: sl-vtld
status: closed
deps: [sl-z57o]
links: [sl-mkuw]
created: 2026-03-21T08:00:21Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, where-used, exploratory-testing]
---
# where-used: NL backtick references in standalone note blocks not surfaced

NL backtick references inside standalone `note { }` blocks (top-level or inside metrics) are not detected by where-used. Only NL backtick references inside mapping transform bodies are surfaced.

**What I did:**
```bash
satsuma where-used product /tmp/satsuma-test-where-used/multi-ref-types.stm
```

The file has a note block containing: `The \`product\` schema is the canonical source of truth`

**What I expected:**
The note block's NL backtick reference to `product` should appear as a reference, similar to how NL refs in transform bodies appear under 'Referenced in NL transform bodies'.

**What actually happened:**
```
References to 'product' (2):

Used as source/target in mappings (1):
  archive products  /tmp/satsuma-test-where-used/multi-ref-types.stm:16

Referenced by metrics (1):
  product_count  /tmp/satsuma-test-where-used/multi-ref-types.stm:25
```

The NL backtick reference in the note block is missing. This also applies to note blocks inside metrics (e.g. `currency_rates` referenced in the order_revenue metric note in examples/metrics.stm).

The root cause is that `resolveAllNLRefs()` only extracts NL from mapping transform bodies, not from standalone note blocks or metric note blocks.

**Reproduction files:** /tmp/satsuma-test-where-used/multi-ref-types.stm, /tmp/satsuma-test-where-used/nl-refs.stm


## Notes

**2026-03-22T00:46:39Z**

Added extractStandaloneNoteRefs and extractBlockNoteRefs to nl-ref-extract.ts to capture NL backtick refs in standalone note blocks and note blocks inside schemas/metrics/fragments. Updated where-used label from 'Referenced in NL transform bodies' to 'Referenced in NL text'. Added test fixture and 3 integration tests. All 581 tests pass.
