---
id: sl-9gvb
status: closed
deps: [sl-wjb9]
links: [sl-z4ya]
created: 2026-03-21T07:59:43Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, arrows, exploratory-testing]
---
# arrows: nested arrow children invisible to field lookup

The arrows command cannot find arrows for fields involved in nested arrow blocks. Both the parent array/record fields and their child fields are invisible.

Nested arrows like:
  tags[] -> labels[] {
    .value -> .label { trim | lowercase }
  }
  address -> addr {
    .street -> .street_line
  }

have three issues:
1. Parent fields (tags, labels, address, addr) return 'No arrows found' even though they participate in a nested arrow
2. Child fields (.value, .label, .street, .street_line) cannot be looked up at all — 'Field not found in schema'
3. Dotted paths (source_sys.address.street, source_sys.tags.value) also return 'Field not found'

What I did:
  satsuma arrows source_sys.tags /tmp/satsuma-test-arrows/all-arrows.stm
  satsuma arrows source_sys.address /tmp/satsuma-test-arrows/all-arrows.stm
  satsuma arrows source_sys.street /tmp/satsuma-test-arrows/all-arrows.stm
  satsuma arrows source_sys.address.street /tmp/satsuma-test-arrows/all-arrows.stm

What I expected:
  - source_sys.tags should show the nested arrow tags[] -> labels[]
  - source_sys.street (or source_sys.address.street) should show .street -> .street_line
  - Inner child arrows should be discoverable

What actually happened:
  - source_sys.tags: 'No arrows found for source_sys.tags'
  - source_sys.address: shows 'address -> addr [none]' but NOT the inner child arrows
  - source_sys.street: 'Field street not found in schema source_sys' (exit 1)
  - source_sys.address.street: 'Field address.street not found in schema source_sys' (exit 1)

Note: source_sys.address partially works — it shows the parent arrow but without the nesting detail. The child arrows inside are completely lost.

Reproducer file: /tmp/satsuma-test-arrows/all-arrows.stm


## Notes

**2026-03-22T00:29:39Z**

Partially fixed: field arrow index now strips leading dots from relative paths. Full fix (arrows command validating nested fields and bracket stripping) deferred.
