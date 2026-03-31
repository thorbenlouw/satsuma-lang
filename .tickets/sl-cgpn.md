---
id: sl-cgpn
status: closed
deps: []
links: []
created: 2026-03-31T08:26:01Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, exploratory-testing]
---
# summary: --help JSON shape missing many actual fields

The summary --help documents a JSON shape that is significantly incomplete compared to the actual output.

Missing from documented shape:
- All block types: 'row' field (line number in file) is present but undocumented
- Metrics: actual output includes displayName, fieldCount, grain, sources — help only documents name and file
- Fragments: actual output includes fieldCount — help only documents name and file

Documented shape:
  metrics: [{"name": str, "file": str}, ...]
  fragments: [{"name": str, "file": str}, ...]

Actual shape:
  metrics: [{"name": str, "file": str, "row": int, "displayName": str|null, "fieldCount": int, "grain": str|null, "sources": [str]}, ...]
  fragments: [{"name": str, "file": str, "row": int, "fieldCount": int}, ...]

Consumers relying on the documented shape will miss available data.


## Notes

**2026-03-31T12:13:16Z**

Cause: summary --help JSON shape documentation was incomplete — missing fieldCount, displayName, grain, sources, row from metrics and fragments.
Fix: Updated --help text to document all actual fields including nlDerivedArrowCount and compact mode behavior.
