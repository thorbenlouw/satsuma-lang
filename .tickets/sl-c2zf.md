---
id: sl-c2zf
status: closed
deps: []
links: [sl-4m85]
created: 2026-03-21T07:59:35Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, schema, exploratory-testing]
---
# schema: text output drops single quotes from quoted schema labels

When a schema has a quoted label (e.g., `schema 'My Complex Schema'`), the text output drops the single quotes, producing output that is not valid Satsuma syntax.

**What I did:**
```bash
satsuma schema "My Complex Schema" /tmp/satsuma-test-schema/quoted-label.stm
```

**Expected:**
```
schema 'My Complex Schema'  (note "Schema with a quoted label") {
```

**Actual:**
```
schema My Complex Schema  (note "Schema with a quoted label") {
```

The quotes are stripped, making the output not round-trippable as valid Satsuma. Multi-word labels require single quotes per the spec (section 2.3 Block Labels).

**Reproducer:** `/tmp/satsuma-test-schema/quoted-label.stm`


## Notes

**2026-03-22T02:00:00Z**

Cause: Text output stripped quote delimiters during rendering.
Fix: Schema text output now wraps multi-word names in single quotes (commit b4269bb).
