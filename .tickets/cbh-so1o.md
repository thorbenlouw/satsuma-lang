---
id: cbh-so1o
status: closed
deps: []
links: [cbh-ukcx, cbh-kyv3, cbh-2y8p, cbh-7ji8, cbh-9cqh, cbh-b0w8, cbh-e01s, sl-kutf, sl-sq4u, sl-h8sb, sl-kqfj]
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


## Notes

**2026-03-26T08:30:15Z**

2026-03-26: Reopened — bug still reproduces. Both nl and nl-refs fail to extract source block join descriptions. The nl command does not include join NL text, and nl-refs does not scan source_block children for @refs. Confirmed with minimal fixture: source { orders, customers, "Left join @orders.id = @customers.id" } — both commands return empty output for this NL content.
