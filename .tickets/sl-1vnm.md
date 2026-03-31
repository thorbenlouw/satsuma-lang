---
id: sl-1vnm
status: open
deps: []
links: []
created: 2026-03-31T08:24:17Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, arrows, field-lineage, exploratory-testing]
---
# arrows/field-lineage: anonymous mapping inside namespace — arrows and field-lineage return no results

When a mapping is anonymous (unnamed) and inside a namespace block, both 'arrows' and 'field-lineage' return no results for the fields in that mapping. Named mappings inside namespaces work correctly.

Repro fixture (/tmp/satsuma-test-arrows-fl/18-namespace.stm):
  namespace ns {
    schema src_ns { val STRING }
    schema tgt_ns { val STRING }
    mapping {
      source { src_ns }
      target { tgt_ns }
      val -> val { trim }
    }
  }

Commands that fail:
  satsuma arrows ns::tgt_ns.val --json /tmp/satsuma-test-arrows-fl/18-namespace.stm
  => 'No arrows found for ns::tgt_ns.val'
  satsuma field-lineage ns::tgt_ns.val --json /tmp/satsuma-test-arrows-fl/18-namespace.stm
  => { field: 'ns::tgt_ns.val', upstream: [], downstream: [] }

Additionally, 'satsuma graph' for this file produces edges with bare field paths (from='::val', to='::val') missing the namespace and schema qualifiers. Compare with a named mapping in a namespace which produces correct paths (from='ns2::src_ns2.val', to='ns2::tgt_ns2.val').

The 'satsuma summary' output also shows the mapping name as 'ns::' (namespace prefix with empty name) instead of something like 'ns::<anon>@file:line'.


## Notes

**2026-03-31T08:25:00Z**

Related to sl-m44v / sl-riw5 (both closed), which fixed anonymous mapping resolution for non-namespaced files. This appears to be the same root cause but specific to the namespace case — anonymous mappings inside namespace blocks. The sl-m44v fix may not have covered the namespace code path.
