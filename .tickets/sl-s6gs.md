---
id: sl-s6gs
status: open
deps: []
links: []
created: 2026-03-31T08:23:30Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, parser, exploratory-testing]
---
# parser-edge: grammar rejects nested each/flatten blocks despite spec allowing it

The tree-sitter grammar does not support nesting each_block or flatten_block inside each_block or flatten_block. The grammar defines each_block and flatten_block bodies as repeat($._arrow_decl), but _arrow_decl only includes computed_arrow, nested_arrow, and map_arrow — not each_block or flatten_block.

However, the spec (SATSUMA-V2-SPEC.md section 4.4, line 429) shows each nested inside each as valid syntax:

  each POReferences -> ShipmentHeader.asnDetails {
    each LineItems -> .items {   // <-- valid per spec
      ...
    }
  }

All combinations fail: each-in-each, flatten-in-each, each-in-flatten, flatten-in-flatten.

Repro:
  echo 'schema s { orders list_of record { items list_of record { name STRING } } }
schema t { flat list_of record { name STRING } }
mapping {
  source { s }
  target { t }
  each orders -> flat {
    each items -> flat { name -> name }
  }
}' > /tmp/test.stm && npx satsuma validate /tmp/test.stm

Expected: valid parse (per spec section 4.4)
Actual: error [parse-error] Syntax error: unexpected 'each'

Fix: add $.each_block and $.flatten_block to the repeat() inside each_block and flatten_block grammar rules, or create a shared _nested_mapping_item choice.

Fixture: /tmp/satsuma-test-parser-edge/24-flatten-in-each.stm, 24b, 24c, 24d, 09-mixed-nesting.stm

