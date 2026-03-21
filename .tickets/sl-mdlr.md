---
id: sl-mdlr
status: open
deps: []
links: [sl-eoco]
created: 2026-03-21T07:59:24Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, context, exploratory-testing]
---
# context: does not search metadata tags/values for query matches

The `satsuma context` command does not search metadata tags and values when scoring blocks, despite the source code comment (line 11) claiming `+1 any metadata key/value contains a query term`. The scoring implementation only checks block name, note text, field names/types, and source/target refs.

**What I did:**
```
satsuma context "pii" /tmp/satsuma-test-context/ --json
satsuma context "enum" /tmp/satsuma-test-context/ --json
```

**Expected:** The query 'pii' should match crm_customers because the field email_address has the metadata tag `(pii, format email)`. The query 'enum' should match crm_customers (loyalty_tier has `enum {gold, silver, bronze}`) and raw_orders (status_code has `enum {P, S, C, R}`).

**Actual output:** Both queries return `[]` (empty results).

**Root cause:** In context.ts, the `scoreEntry` function (line 128) does not access any metadata property on index entries. The source code header comment on line 11 says `+1 any metadata key/value contains a query term` but this is not implemented. The workspace index may not even store per-field metadata in the fields array.

**Repro files:** /tmp/satsuma-test-context/customers.stm (has pii and enum metadata), /tmp/satsuma-test-context/orders.stm (has enum metadata)

