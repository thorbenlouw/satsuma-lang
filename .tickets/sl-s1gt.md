---
id: sl-s1gt
status: open
deps: [sl-pxw5, sl-60gz]
links: []
created: 2026-03-29T18:51:45Z
type: task
priority: 2
assignee: Thorben Louw
---
# feat(26): LSP — add NL-derived edge annotations to VizModel using satsuma-core

Update buildVizModel in vscode-satsuma/server/src/viz-model.ts to annotate ArrowEntry.transform with NL-derived references extracted via satsuma-core's extractBacktickRefs(). This gives the viz panel visibility into implicit data dependencies expressed in natural-language transform text.

Changes:
1. Extend TransformInfo interface: add nlRefs?: BacktickRef[] field
2. In the arrow extraction section of buildVizModel, after populating transform.text and transform.steps, call extractBacktickRefs(nlText) and attach results to transform.nlRefs
3. Only populate nlRefs when the transform kind is 'nl' or 'mixed' (no-op for 'pipeline' transforms with no NL steps)
4. Import BacktickRef and extractBacktickRefs from '@satsuma/core/nl-ref' (or '@satsuma/core')

This is NOT full NL ref resolution (which would require the CLI's WorkspaceIndex). It is structured extraction of what refs are mentioned — enough for the viz to render NL-derived edges with a distinct visual treatment (dashed border, label) without resolving them to specific definitions.

The viz component (satsuma-viz/src/) does not need to change in this ticket — it already has a TransformInfo type it consumes; adding nlRefs as an optional field is backward compatible. A follow-on feature ticket can add visual rendering of nlRefs.

PRD success criterion addressed: 'The LSP server can produce NL-derived field edges in the VizModel by reusing satsuma-core's NL ref resolution'.

## Acceptance Criteria

1. TransformInfo.nlRefs?: BacktickRef[] is present in the interface 2. buildVizModel for examples/sfdc_to_snowflake.stm (or equivalent) produces a VizModel where an arrow with NL text containing @fx_spot_rates or similar ref has nlRefs populated 3. Arrows with purely structural transforms have nlRefs undefined or empty 4. All existing LSP viz-model tests pass 5. New test: buildVizModel for a mapping with NL transform 'Convert using @exchange_rate_table' → ArrowEntry.transform.nlRefs contains [{ref: 'exchange_rate_table', offset: ...}]

