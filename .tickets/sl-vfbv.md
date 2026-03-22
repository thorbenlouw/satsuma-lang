---
id: sl-vfbv
status: closed
deps: []
links: [sl-m4l5]
created: 2026-03-21T08:01:23Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, schema, exploratory-testing]
---
# schema: --compact fails to strip triple-quoted field notes

The `--compact` flag correctly strips single-line `(note "...")` metadata from fields, but fails to strip triple-quoted `(note """..."""` metadata. This inconsistency means compact output can still contain large multi-line note blocks.

**What I did:**
```bash
satsuma schema legacy_sqlserver examples/ --compact
```

**Expected:** The PHONE_NBR field should have its note stripped, showing just:
```
PHONE_NBR               VARCHAR(50)
```

**Actual:** The triple-quoted note survives compact mode:
```
PHONE_NBR               VARCHAR(50) (
  note """
  No consistent format across the dataset:
  - **42%** \`(555) 123-4567\` — US with parentheses
  - **31%** \`555.123.4567\` — dot-separated
  ...
  """
)
```

In contrast, simple `(note "text")` metadata IS correctly stripped by --compact (verified with a test fixture where `notes_field TEXT (note "This is a field note")` becomes `notes_field TEXT`).

**Reproducer:** `examples/db-to-db.stm`, schema `legacy_sqlserver`, field `PHONE_NBR`.


## Notes

**2026-03-22T02:00:00Z**

Cause: Compact regex used .* which doesn't match newlines in triple-quoted strings.
Fix: Use [\s\S]*? regex to match across newlines (commit 87afeac).
