---
id: sl-5fbn
status: closed
deps: []
links: [sl-m4l5]
created: 2026-03-21T08:00:04Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, schema, exploratory-testing]
---
# schema: --compact and --fields-only flags have no effect on --json output

The `--compact` and `--fields-only` flags have no effect when combined with `--json`. The JSON output is identical regardless of whether these flags are specified.

**What I did:**
```bash
satsuma schema country_codes examples/ --json
satsuma schema country_codes examples/ --json --compact
satsuma schema country_codes examples/ --json --fields-only
```

**Expected:** 
- `--json --compact` should omit the `note` field and any NL content from the JSON
- `--json --fields-only` should return only the fields array, without note/file/row wrapper

**Actual:** All three produce identical JSON output, including the `note` field in every case.

For `--compact`, the text output correctly strips notes, but the JSON output does not.
For `--fields-only`, the text output correctly strips the schema wrapper and field metadata, but the JSON output includes everything.

**Reproducer:** Any schema with a note, e.g. `examples/common.stm`, schema `country_codes`.

