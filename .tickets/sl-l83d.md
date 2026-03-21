---
id: sl-l83d
status: open
deps: []
links: []
created: 2026-03-21T08:01:58Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, schema, exploratory-testing]
---
# schema: --json not-found error returns plain text instead of JSON

When `--json` is specified and the schema is not found, the error message is returned as plain text instead of a JSON error object. This makes it harder for programmatic consumers to distinguish between success and failure without parsing the exit code.

**What I did:**
```bash
satsuma schema nonexistent examples/ --json
```

**Expected:** A JSON error response, e.g.:
```json
{"error": "Schema 'nonexistent' not found.", "available": [...]}
```

**Actual:** Plain text output:
```
Schema 'nonexistent' not found.
Available: cobol_customer_master, customer_event_avro, ...
```

Exit code is correctly 1, but the output format doesn't match the --json contract.

**Reproducer:** `satsuma schema nonexistent examples/ --json`

