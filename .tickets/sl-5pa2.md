---
id: sl-5pa2
status: open
deps: []
links: []
created: 2026-03-21T07:59:59Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, schema, exploratory-testing]
---
# schema: --json output for namespace-qualified schemas omits namespace in name field

When retrieving a namespace-qualified schema with `--json`, the JSON output's `name` field contains only the bare name without the namespace qualifier. There is also no separate `namespace` field to convey the context.

**What I did:**
```bash
satsuma schema "pos::stores" examples/ --json
```

**Expected:** JSON to include namespace context, e.g.:
```json
{"name": "pos::stores", ...}
```
or:
```json
{"name": "stores", "namespace": "pos", ...}
```

**Actual:**
```json
{"name": "stores", ...}
```

No namespace information is present. For programmatic consumers, there is no way to determine from the JSON output alone which namespace this schema belongs to.

The same issue exists in text output: `schema stores (note "POS store reference data")` instead of `schema pos::stores`.

**Reproducer:** `examples/namespaces.stm`, schema `pos::stores` or any namespace-qualified schema.

