---
id: sl-i1b8
status: closed
deps: [sl-rbvk]
links: [sl-armj]
created: 2026-03-21T07:58:25Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, metric, exploratory-testing]
---
# metric: JSON output omits field metadata (measure, note)

The satsuma metric --json output includes fields with name and type only, dropping all field-level metadata such as measure additivity and inline notes.

- What I did: ran 'satsuma metric order_revenue examples/ --json'
- Expected: each field in the JSON fields array should include its metadata, e.g. {"name": "gross_revenue", "type": "DECIMAL(14,2)", "metadata": [{"key": "measure", "value": "additive"}]}
- Actual: fields array contains only {"name": "gross_revenue", "type": "DECIMAL(14,2)"} — no metadata.

This affects all metrics with measure annotations (additive, non_additive, semi_additive) and field-level notes. The text output correctly shows field metadata, but JSON drops it.

The root cause is the FieldDecl type (types.ts) only has name, type, children, isList — no metadata property. The JSON serialization uses entry.fields from the index, which strips metadata during extraction.

Examples affected:
- monthly_recurring_revenue: value (measure additive)
- pipeline_value: weighted_arr_value (measure additive, note '...')
- order_revenue: 5 fields with measure annotations

Test file: /tmp/satsuma-test-metric/basic.stm

