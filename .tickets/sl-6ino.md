---
id: sl-6ino
status: closed
deps: []
links: [sl-wvn8]
created: 2026-03-21T08:06:32Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, nl, exploratory-testing]
---
# nl: transform_block NL items have null parent instead of the transform name

When extracting NL content from standalone transform blocks, the parent field is null instead of the transform block's name. This makes it impossible to attribute NL content to its containing transform when using the 'all' scope.

- What I did: satsuma nl all /tmp/satsuma-test-nl/comprehensive.stm --json
- Expected: Transform NL items from named transform blocks should have parent set to the transform name (e.g. 'nl transform' or 'mixed transform')
- Got: parent: null for all standalone transform NL items
- Root cause: nl-extract.ts walkNL() sets newParent for schema_block, mapping_block, metric_block, and fragment_block, but does not handle transform_block.
- Reproducer: /tmp/satsuma-test-nl/comprehensive.stm (contains transform 'nl transform' and transform 'mixed transform')


## Notes

**2026-03-22T02:00:00Z**

Cause: NL extraction didn't set parent for transform_block items.
Fix: transform_block NL items now use the transform name as parent (commit 46fa9df).
