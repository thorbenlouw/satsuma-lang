---
id: sl-h8sb
status: open
deps: []
links: [sl-sq4u, cbh-so1o, sl-kqfj]
created: 2026-03-26T08:29:47Z
type: bug
priority: 1
assignee: Thorben Louw
---
# nl-ref-extract: @refs in standalone/schema note blocks silently ignored

extractStandaloneNoteRefs in nl-ref-extract.ts only checks for backtick refs (line 360: text.includes('`')), missing the @ref pattern check that walkArrowsForNL has (line 421). Result: @refs in standalone note blocks, schema notes, metric notes, and fragment notes are never extracted. They don't appear in validate warnings, lint findings, lineage edges, or graph output. Backtick refs in the same positions ARE detected.

## Acceptance Criteria

1. satsuma nl-refs finds @refs in standalone note blocks
2. satsuma nl-refs finds @refs in schema/metric/fragment note blocks
3. satsuma validate warns about unresolved @refs in all note block types
4. satsuma lint hidden-source-in-nl detects @refs in all note block types

