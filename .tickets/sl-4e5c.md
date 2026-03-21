---
id: sl-4e5c
status: open
deps: [sl-wjb9]
links: [sl-z4ya]
created: 2026-03-21T08:04:49Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, graph, exploratory-testing]
---
# graph: nested array arrow edges have corrupted paths and merged entries

When a mapping uses array mapping syntax (src[] -> tgt[] with nested .child -> .child arrows), the graph --json output produces corrupted edges with multiple issues.

What I did:
  Created /tmp/satsuma-test-graph/array-mapping.stm:
    mapping 'flatten orders' {
      source { `order_api` }
      target { `order_flat` }
      order_id -> order_id
      line_items[] -> items[] {
        .sku -> .product_code { trim | uppercase }
        .qty -> .quantity
        .price -> .unit_price { round(2) }
      }
    }
  
  Ran: satsuma graph /tmp/satsuma-test-graph/array-mapping.stm --json

What I expected:
  Five clean edges:
    order_api.order_id -> order_flat.order_id
    order_api.line_items[].sku -> order_flat.items[].product_code [structural]
    order_api.line_items[].qty -> order_flat.items[].quantity [none]
    order_api.line_items[].price -> order_flat.items[].unit_price [structural]
    order_api.line_items[] -> order_flat.items[] [none]  (parent array edge)

What actually happened:
  Three bugs in nested child arrow handling:

  1) Missing parent path prefix: Child arrow .sku -> .product_code becomes:
     from: "order_api.sku"  (should be "order_api.line_items[].sku")
  
  2) Merged/corrupted edge: Two child arrows (.qty -> .quantity and .price -> .unit_price) are merged with a newline in the target path:
     from: "order_api.qty"
     to: "order_flat.quantity\n    .price"
  
  3) Lost source field: .price -> .unit_price { round(2) } is treated as a derived arrow:
     from: null
     to: "order_flat.unit_price"
     derived: true
     (should have from: "order_api.line_items[].price")

Reproducer: /tmp/satsuma-test-graph/array-mapping.stm

