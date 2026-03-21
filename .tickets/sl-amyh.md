---
id: sl-amyh
status: closed
deps: [sl-cdvp]
links: [sl-xh3b]
created: 2026-03-21T07:58:25Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, find, exploratory-testing]
---
# find: --tag note never matches fields with note metadata

The `satsuma find --tag note` command returns no matches even though many fields and schemas have `(note "...")` metadata.

**What I did:**
```
satsuma find --tag note /tmp/satsuma-test-find/
satsuma find --tag note examples/
```

**What I expected:**
Fields with `(note "...")` metadata should be returned. For example, `examples/sap-po-to-mfcs.stm` has fields like `EKGRP STRING(3) (note "Purchasing group")`.

**What actually happened:**
```
No matches found.
``` (exit code 1)

The examples corpus has numerous fields with inline `note` metadata (grep shows at least 10 in `examples/`), yet none are found.

This is likely because `note` has a special CST node type (`note_entry` with a string value) that differs from simple tag tokens, and the find command's tag-matching logic doesn't account for it.

**Test fixture:** /tmp/satsuma-test-find/diverse-tags.stm (line 12: `notes_field STRING (note "This has a note")`)

