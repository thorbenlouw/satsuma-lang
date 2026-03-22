---
id: sl-qx8n
status: closed
deps: [sl-cdvp]
links: [sl-xh3b]
created: 2026-03-21T07:58:21Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, find, exploratory-testing]
---
# find: --tag enum never matches fields with enum metadata

The `satsuma find --tag enum` command returns no matches even though many fields across the examples corpus have `enum {...}` metadata.

**What I did:**
```
satsuma find --tag enum /tmp/satsuma-test-find/
satsuma find --tag enum examples/
```

**What I expected:**
Fields with `enum {active, inactive, suspended}` (and similar) metadata should be returned.

**What actually happened:**
```
No matches found.
``` (exit code 1)

The examples corpus contains dozens of fields with `enum {...}` metadata (e.g. `examples/db-to-db.stm` line 32: `CUST_TYPE CHAR(1) (enum {R, B, G}, default R)`), yet none are found.

This is likely because `enum` has a special CST node type (enum block with braces) that differs from simple tag tokens, and the find command's tag-matching logic doesn't account for it.

**Test fixture:** /tmp/satsuma-test-find/diverse-tags.stm (line 8: `status STRING (enum {active, inactive, suspended})`)


## Notes

**2026-03-22T00:14:47Z**

Fixed in prior commit - findTagInMeta already handles enum_body and slice_body
