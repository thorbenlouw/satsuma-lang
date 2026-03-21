---
id: sl-rbvk
status: open
deps: []
links: []
created: 2026-03-21T07:59:17Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, schema, exploratory-testing]
---
# schema: --json fields array omits field metadata (pk, required, enum, ref, etc.)

The `satsuma schema <name> --json` output includes a `fields` array with structured objects, but each field object only has `name` and `type` properties — all field metadata (pk, required, unique, indexed, pii, enum, ref, default, note, xpath, encrypt, format, filter) is omitted from the structured representation.

The `fieldLines` array contains raw text that includes the metadata, but the structured `fields` array — the primary interface for programmatic consumers — loses it entirely.

**What I did:**
```bash
satsuma schema sfdc_opportunity examples/ --json
```

**Expected:** Each field object to include a `metadata` property, e.g.:
```json
{"name": "Id", "type": "ID", "metadata": ["pk"]}
```

**Actual:** Field objects only have name and type:
```json
{"name": "Id", "type": "ID"}
```

Fields affected: all metadata tokens are lost — pk, required, unique, indexed, pii, format email, enum {}, default, ref, note, xpath, encrypt, filter.

**Reproducer file:** Any schema with metadata, e.g. `examples/common.stm` (country_codes has pk on alpha2) or `examples/sfdc_to_snowflake.stm` (sfdc_opportunity has pk, required, ref, enum, default).

