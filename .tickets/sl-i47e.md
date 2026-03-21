---
id: sl-i47e
status: open
deps: []
links: [sl-x11k]
created: 2026-03-21T08:00:45Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, where-used, exploratory-testing]
---
# where-used: --json flag outputs plain text for non-existent name errors

When using --json and the queried name does not exist, the error message is output as plain text instead of JSON. This breaks machine consumers that expect JSON on stdout.

**What I did:**
```bash
satsuma where-used nonexistent /tmp/satsuma-test-where-used/ --json
```

**What I expected:**
JSON error response, e.g.:
```json
{"error": "'nonexistent' not found as a schema, fragment, or transform."}
```

**What actually happened:**
```
'nonexistent' not found as a schema, fragment, or transform.
```

The error is written to stderr via console.error and process.exit(1) before the JSON output logic runs. While stderr is technically separate from stdout, the --json flag should ensure that any output on stdout is valid JSON, or alternatively the error should be output as a JSON object on stdout.

**Reproduction:** Run `satsuma where-used nonexistent /tmp/satsuma-test-where-used/ --json` and observe plain text output.

