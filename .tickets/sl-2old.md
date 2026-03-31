---
id: sl-2old
status: open
deps: []
links: []
created: 2026-03-31T08:32:55Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, primitives, exploratory-testing]
---
# meta/fields: kv metadata values retain literal quote characters for string values

When metadata key-value entries have a quoted string value (e.g. classification "INTERNAL"), the JSON output retains the literal quote characters in the value field, producing '"INTERNAL"' instead of 'INTERNAL'.

Reproduction:
  schema s (classification "INTERNAL") { x STRING }
  satsuma meta s --json
  # entries: [{"kind": "kv", "key": "classification", "value": '"INTERNAL"'}]

  schema t (format parquet) { y STRING }
  satsuma meta t --json
  # entries: [{"kind": "kv", "key": "format", "value": "parquet"}]

Expected: Both should produce clean values without quote characters. classification should have value 'INTERNAL' not '"INTERNAL"'.

Affects: meta --json, fields --json (metadata entries). Unquoted identifier values (like 'parquet') are correctly bare. Only quoted string values (like '"INTERNAL"') retain the delimiters.

This also affects the metadata array in find --json output, where string values like classification appear as 'classification "INTERNAL"' with embedded quotes.

