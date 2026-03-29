---
id: sl-m44v
status: closed
deps: []
links: []
created: 2026-03-29T09:00:40Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, field-lineage, exploratory-testing]
---
# field-lineage: anonymous mappings not traced — upstream/downstream empty

Fixture: /tmp/satsuma-test-field-lineage/a-errors/fix.stm
Command: satsuma field-lineage invoices.total /tmp/satsuma-test-field-lineage/a-errors/ --json

Expected: upstream shows ::orders.amount via the anonymous mapping, since amount -> total { round(2) } is a declared arrow.

Actual:
{
  "field": "::invoices.total",
  "upstream": [],
  "downstream": []
}

Root cause (traced): buildFieldEdgeGraph() in field-lineage.ts looks up the mapping with (record.mapping ?? ""), but anonymous mappings are stored in index.mappings under <anon>@file:row keys, not under empty string. This means mapping is undefined, sourceSchemas and targetSchemas are [], qualifyField returns the bare field name, and the canonical key never matches the qualified field key used for traversal.

Same bug affects all anonymous (unnamed) mappings. Named mappings work correctly.


## Notes

**2026-03-29T11:39:32Z**

**2026-03-29T11:39:32Z**

Cause: Arrow records inside anonymous mappings had mapping=null; buildIndex looked up "" in index.mappings which never matched <anon>@file:row keys.
Fix: In buildIndex, resolve anonymous arrow records to their <anon>@file:row key by matching arrow line against mapping start rows. (commit pending)
