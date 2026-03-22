---
id: sl-0ycs
status: closed
deps: []
links: [sl-cthr, sl-u0ev, sl-fs3a, sl-ht9n, sl-ivel, sl-la5z, sl-fzfx]
created: 2026-03-21T21:52:59Z
type: epic
priority: 1
assignee: Thorben Louw
tags: [cli, exit-codes]
---
# Epic: Exit code consistency

Commands returning exit code 0 for no-results instead of documented exit code 1.


## Notes

**2026-03-22T02:00:00Z**

Cause: Seven commands returned exit 0 for no-results instead of the documented exit 1.
Fix: Standardized exit codes across warnings, context, arrows, where-used, nl-refs, graph, and lineage commands (commit 781dc99).
