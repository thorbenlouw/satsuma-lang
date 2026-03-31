---
id: sl-t8b4
status: open
deps: []
links: []
created: 2026-03-31T08:31:39Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, primitives, exploratory-testing]
---
# find: schema-level tag entries missing fieldType key in JSON output

When 'satsuma find --tag <token> --json' returns schema-level metadata matches (field: '(schema)'), the JSON object is missing the 'fieldType' key entirely. The documented JSON shape states fieldType is 'str | null', so it should be present as null for schema-level entries.

Reproduction:
  schema order_events (classification "INTERNAL") { id INT }
  satsuma find --tag classification --json
  # Output: {"blockType": "schema", "block": "order_events", "field": "(schema)", "tag": "classification", "metadata": [...], ...}
  # Missing: "fieldType" key

Expected: {"fieldType": null, ...} for schema-level entries, consistent with field-level entries that always include fieldType.

Field-level entries correctly include fieldType (e.g. "STRING(255)"). Only schema-level entries omit it.

