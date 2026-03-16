---
id: stm-14x.7
status: open
deps: [stm-14x.5]
links: []
created: 2026-03-13T13:46:54Z
type: task
priority: 2
parent: stm-14x
---
# Add parser consumer proof and CST summary smoke tests

Add a thin consumer script that parses STM files and emits a JSON summary of blocks, fields, maps, notes, comments, and annotations so downstream tooling can prove it can use the CST without reparsing raw text.

## Acceptance Criteria
- A small script or CLI helper emits JSON summaries from parser output without reparsing source text through custom regex/string logic.
- The summary includes top-level blocks, schema fields/groups, map entries, paths, notes, comments with severity, and annotations.
- Automated smoke tests run the consumer against every example file and assert key structural counts or shapes.
- The consumer documentation explains intended usage and the CST nodes it depends on.
- Any CST gaps discovered during the proof are documented and either fixed or turned into explicit follow-up issues before completion.


## Acceptance Criteria

- A small script or CLI helper emits JSON summaries from parser output without reparsing source text through custom regex/string logic.
- The summary includes top-level blocks, schema fields/groups, map entries, paths, notes, comments with severity, and annotations.
- Automated smoke tests run the consumer against every example file and assert key structural counts or shapes.
- The consumer documentation explains intended usage and the CST nodes it depends on.
- Any CST gaps discovered during the proof are documented and either fixed or turned into explicit follow-up issues before completion.


