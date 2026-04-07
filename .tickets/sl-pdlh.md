---
id: sl-pdlh
status: closed
deps: []
links: []
created: 2026-04-07T09:43:10Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# tests: grow thin command test files

summary (4), warnings (3), workspace (5), lineage (8) tests are too thin. Cover all flags and JSON output modes. Feature 29 TODO #15.

## Acceptance Criteria

Each of summary/warnings/workspace/lineage covers all primary flags in both text and JSON output.


## Notes

**2026-04-07T16:16:20Z**

Cause: summary, warnings, workspace, and lineage test files were thin and in some cases mirrored formatter/helper logic instead of exercising the public command contracts. Fix: Replaced the shallow formatter/helper copies with real CLI subprocess coverage for summary, warnings, and lineage flags, strengthened workspace resolver/loader boundary tests, and added a real lineage cycle fixture. (commit 7945579)
