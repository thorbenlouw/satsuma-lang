---
id: sl-yumm
status: open
deps: []
links: []
created: 2026-03-30T06:39:13Z
type: chore
priority: 3
assignee: Thorben Louw
---
# hover.ts: organise large switch body and document TAG_DESCRIPTIONS and magic slice(0, 8)

tooling/vscode-satsuma/server/src/hover.ts has three readability defects:

1. Lines 95-320: the hover handler is a large switch/if-chain (~225 lines) with no sectional organisation. Cases for schema, mapping, metric, fragment, transform, arrow, and import are interleaved with no grouping labels. A reader must scan the whole body to locate the handler for a given node type.

2. Lines 118 (approximately): field preview uses slice(0, 8) — magic number with no explanation. Why 8? Should this be a named constant?

3. Lines 362-376: TAG_DESCRIPTIONS is a hardcoded object with no comment citing the source of these descriptions. Are they from the spec? Are they complete?

## Acceptance Criteria

- The switch/if body in the hover handler is divided into clearly labelled sections (e.g. '// --- Schema hover ---', '// --- Mapping hover ---') so a reader can navigate to a specific case in seconds
- The field preview limit is extracted to a named constant (e.g. MAX_HOVER_FIELDS) with a comment explaining the UX rationale for the cap
- TAG_DESCRIPTIONS has a comment noting where these descriptions come from and whether the list is intended to be exhaustive
- All existing hover tests pass

