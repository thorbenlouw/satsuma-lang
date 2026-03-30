---
id: aa-65ni
status: closed
deps: []
links: []
created: 2026-03-30T18:51:24Z
type: task
priority: 2
assignee: Thorben Louw
---
# core: extend FieldDecl with optional source location for LSP consumers


## Notes

**2026-03-30T18:51:32Z**

## Notes

**2026-03-30T12:00:00Z**

Cause: FieldDecl lacked CST position data (startRow/startColumn), and all Extracted* types were missing startColumn — preventing LSP consumers from mapping extracted data back to precise source locations.
Fix: Added startRow and startColumn to FieldDecl (optional, populated by extractFieldTree). Added startColumn to all 11 Extracted* interfaces and their construction sites. Updated doc-comments on FieldDecl fields. Added 8 new tests for position data.
