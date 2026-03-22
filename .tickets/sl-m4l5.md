---
id: sl-m4l5
status: closed
deps: []
links: [sl-86n4, sl-5fbn, sl-vexa, sl-vfbv]
created: 2026-03-21T21:53:03Z
type: epic
priority: 2
assignee: Thorben Louw
tags: [cli, flags]
---
# Epic: Filter flags not affecting --json

Filter and compact flags silently ignored when --json output is used.


## Notes

**2026-03-22T02:00:00Z**

Cause: --compact, --fields-only, --matched-only, --unmatched-only flags were ignored by JSON output paths.
Fix: Applied filter flags to JSON output across schema, summary, and match-fields commands (closed in commit cf955f7).
