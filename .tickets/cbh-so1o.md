---
id: cbh-so1o
status: open
deps: []
links: []
created: 2026-03-25T11:17:46Z
type: bug
priority: 2
assignee: Thorben Louw
---
# nl: source block join NL strings missing from mapping NL output

When a mapping has NL strings in the source block (join descriptions), 'satsuma nl' does not include them in the output.

- Exact command: satsuma nl 'order enrichment' /tmp/satsuma-bug-hunt/
- Expected: Should include the join NL from the source block: 'Join order_header to customer_master on order_header.customer_id = customer_master.cust_id. Join order_header to warehouse_products on order_header.product_id = warehouse_products.product_id.'
- Actual: Only shows '[transform] Extract year from order_date (order enrichment)' — the source block join NL is completely missing

The join NL is defined on line 138-139 of mappings.stm inside the source block of the 'order enrichment' mapping. This is meaningful NL content that describes how sources are joined.
- Test file: /tmp/satsuma-bug-hunt/mappings.stm (lines 138-139)

