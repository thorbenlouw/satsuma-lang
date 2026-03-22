---
id: sl-wvn8
status: closed
deps: []
links: [sl-gu24, sl-j014, sl-6ino, sl-vw49, sl-3dd2, sl-z57o, sl-djeo]
created: 2026-03-21T21:53:14Z
type: epic
priority: 2
assignee: Thorben Louw
tags: [cli, nl]
---
# Epic: NL extraction gaps

NL-related commands miss content in certain locations (transforms, concatenated strings, escape sequences).


## Notes

**2026-03-22T02:00:00Z**

Cause: NL extraction had issues with parent attribution, concatenation, escape sequences, scope resolution, and transform/note block coverage.
Fix: Systematic fixes across nl-extract.ts and nl-ref-extract.ts (closed in commit cf955f7).
