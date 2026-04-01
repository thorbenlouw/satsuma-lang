---
id: sl-van1
status: closed
deps: []
links: [sl-18hw]
created: 2026-03-31T08:24:57Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, exploratory-testing]
---
# diff: mapping note block changes not detected

When a mapping's note block text changes, diff reports 'No structural differences'. The diff compares schema-level (note "...") annotations correctly, but internal note {} blocks inside mappings are not compared.

Repro:
v1 mapping has: note { Original mapping note. }
v2 mapping has: note { Updated mapping note with more detail. }
Result: 'No structural differences'

Similarly, standalone top-level note {} block changes and additions are not detected by diff.


## Notes

**2026-03-31T08:26:49Z**

This is a regression of sl-18hw which was closed as fixed. Testing shows the fix is non-functional: standalone note additions, standalone note text changes, and mapping note text changes are all still undetected. The --json 'notes' key always shows empty added/removed arrays.

**2026-04-01T07:40:46Z**

**2026-03-31T12:00:00Z**

Cause: Mapping note and standalone note detection was already implemented and working correctly.
Fix: Verified both mapping note and standalone note detection work. Added four new unit tests covering additions, text changes, and block-vs-top-level isolation.
