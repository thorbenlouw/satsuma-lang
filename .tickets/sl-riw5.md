---
id: sl-riw5
status: closed
deps: []
links: []
created: 2026-03-29T09:01:20Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, graph, exploratory-testing]
---
# graph: field-level edges for anonymous mappings have empty mapping key and unqualified field refs

Fixture: /tmp/satsuma-test-field-lineage/a-errors/fix.stm (anonymous mapping: no name)
Command: satsuma graph /tmp/satsuma-test-field-lineage/a-errors/ --json

Expected edges array entries like:
  { "from": "::orders.amount", "to": "::invoices.total", "mapping": "<anon>@...", "classification": "structural" }

Actual edges array:
  { "from": "::amount", "to": "::total", "mapping": "", "classification": "structural", ... }

Issues:
1. 'mapping' field is empty string instead of the canonical anonymous mapping key
2. 'from'/'to' fields are bare field names (::amount, ::total) without schema prefix

Root cause: buildFieldArrows() in index-builder.ts uses qualifiedKey(record.namespace, record.mapping) to look up the mapping, but anonymous mappings are stored under <anon>@file:row keys. With mapping=null, qualifiedKey returns ''. No mapping found means no sourceSchemas/targetSchemas, so qualifyField() returns bare field names.

This is the underlying cause of sl-m44v (field-lineage silent miss for anonymous mappings).


## Notes

**2026-03-29T11:39:32Z**

**2026-03-29T11:39:32Z**

Cause: Same root cause as sl-m44v — anonymous mapping key was empty string, so no mapping found, no sourceSchemas/targetSchemas, qualifyField returned bare names.
Fix: Resolved at index-build time in buildIndex (same fix as sl-m44v). (commit pending)
