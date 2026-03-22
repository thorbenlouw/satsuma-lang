---
id: sl-cyen
status: closed
deps: [sl-jt7q, sl-armj, sl-cdvp]
links: [sl-ck20, sl-6gta, sl-o4wq, sl-h13n, sl-18hw, sl-zqqu]
created: 2026-03-21T21:53:20Z
type: epic
priority: 2
assignee: Thorben Louw
tags: [cli, diff]
---
# Epic: diff command gaps

diff only compares schema fields and mapping arrow counts. Missing: metrics, fragments, transforms, field metadata, arrow details, notes.


## Notes

**2026-03-22T02:00:00Z**

Cause: Diff command didn't detect metadata changes, transform changes, note changes, or individual arrow changes.
Fix: Extended Delta type and diff logic to cover all change types (closed in commit dce4de0).
