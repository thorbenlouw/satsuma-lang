---
id: sc-8lt4
status: closed
deps: [sc-fosy]
links: []
created: 2026-03-22T20:17:40Z
type: task
priority: 1
assignee: Thorben Louw
parent: sc-v2pn
tags: [docs]
---
# Update AI-AGENT-REFERENCE.md for unified syntax

Update EBNF grammar notation, quick reference schema/mapping examples, replace [] with each/flatten, update tips/rules referencing old syntax.

## Acceptance Criteria

Agent reference matches spec. No old syntax references remain.


## Notes

**2026-03-22T21:12:26Z**

**2026-03-23T00:10:00Z**

Cause: Agent reference used old record/list/[] syntax in EBNF and examples.
Fix: Updated EBNF grammar, cheat sheet, common mistakes table. Added each_block/flatten_block rules. Removed [] from paths. (commit fbb0221)
