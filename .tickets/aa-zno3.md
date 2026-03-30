---
id: aa-zno3
status: closed
deps: []
links: []
created: 2026-03-30T18:46:10Z
type: chore
priority: 2
assignee: Thorben Louw
---
# core: add escape handling to stringText() and reconcile with CLI stripDelimiters()


## Notes

**2026-03-30T18:46:22Z**

## Notes

**2026-03-30T00:00:00Z**

Cause: Core's stringText() stripped nl_string delimiters but did not unescape \" and \\ sequences. The CLI's nl-extract.ts had its own stripDelimiters() that correctly handled escapes, creating duplicated and divergent logic.
Fix: Added escape handling (\" → " and \\ → \) to core's stringText() for nl_string nodes. Deleted CLI's stripDelimiters() and replaced all call sites with core's stringText(). Added unit tests for empty strings, escaped quotes, escaped backslashes, mixed escapes, and multiline string passthrough.
