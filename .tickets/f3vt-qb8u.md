---
id: f3vt-qb8u
status: open
deps: []
links: []
created: 2026-04-09T19:38:04Z
type: bug
priority: 1
assignee: Thorben Louw
parent: sl-0jva
tags: [viz, bug, feature-30-followup]
---
# viz overview: edges do not anchor cleanly to schema cards in dense lineage layouts

## Symptom

Discovered while inspecting the Feature 30 screenshot review artifacts
(`tooling/satsuma-viz-harness/screenshots/`). On the
`metrics-overview-lineage-all-files.png` shot the overview edges visibly do
not meet the source schema card right edges or the target card left edges —
arrows appear to terminate offset from card bodies, and lines pass through
the orange `fact_*` / `dim_*` source cards rather than anchoring at their
boundaries. `reports-overview.png` shows similar misalignment in the dense
multi-column layout.

By contrast, `sfdc-overview-single.png` and `namespaces-overview-lineage.png`
look correct — arrows anchor cleanly. So the regression manifests in dense
lineage layouts (multi-file lineage merge with metric/report cards) and not
in the simple single-file or namespaced cases the existing semantic
geometry tests cover.

The semantic geometry tests in
`tooling/satsuma-viz-harness/test/harness.test.ts` only assert positive
dimensions, source < mapping < target ordering, and non-overlap. They do
not assert that edge endpoints land on card edges, which is why this slipped
past the automated suite and was caught by the new screenshot review
workflow (sl-mm7v).

## Reproduction

1. Run the harness watcher (`watch-and-test.sh`).
2. Trigger a Playwright run (`touch tooling/satsuma-viz-harness/.run-tests`).
3. Open
   `tooling/satsuma-viz-harness/screenshots/metrics-overview-lineage-all-files.png`.
4. Compare against `sfdc-overview-single.png` and
   `namespaces-overview-lineage.png` from the same run.

## Candidate hypotheses (NOT yet verified)

I traced the relevant code paths but did NOT bisect with dev tools open in
a real browser. Each hypothesis below needs interactive verification before
fixing.

1. **24px coordinate-system offset between the SVG edge layer and the card
   layer.** In `tooling/satsuma-viz/src/satsuma-viz.ts:1333` the canvas has
   `padding: 24px`. The edge layer host is positioned `style="left: 24px;
   top: 0; z-index: 30;"` (line 1336) — that is relative to the canvas
   *padding box*. The `.card-layer` is `position: relative` with no offset,
   so its absolutely-positioned children at `left: ${node.x}px` are
   relative to the same padding box origin. The edge layer's SVG `(0,0)`
   sits at `(48, 24)` of the canvas outer box; the card layer's `(0,0)`
   sits at `(24, 24)`. That is a 24px horizontal mismatch — edge endpoints
   would draw 24px to the right of where cards actually render. This would
   explain the offset, BUT it would also predict the same 24px offset on
   sfdc and namespaces, which look correct. So if the offset is real, the
   geometry tests' "no overlap" tolerance and the wider single-column card
   spacing must be hiding it in the simpler fixtures.

2. **Metric-card width discrepancy.** Overview metric nodes are sized via
   `estimateCompactTextCardWidth(m.id)` in
   `tooling/satsuma-viz/src/layout/elk-layout.ts:767`. The actual rendered
   `<sz-metric-card compact>` may not match this estimate — if the rendered
   card is wider than the layout width, both the right edge anchor and the
   visible card body diverge. Verify by reading the computed width of a
   `<sz-metric-card>` in dev tools and comparing against the corresponding
   `LayoutNode.width`.

3. **Lineage merge produces in-flight edges that look wrong.** In lineage
   mode `metrics.stm` imports from `metric_sources.stm`, which has its own
   mappings producing the `fact_*` schemas as targets. Some of the lines
   visible passing through the orange cards may be legitimate target-side
   anchors for those in-merge mappings, and the offset may be how the eye
   reads dense routing rather than a true rendering bug. Verify by toggling
   the file filter to `metric_sources.stm` only and checking whether the
   suspect lines disappear (`metrics-overview-file-filter-sources.png` from
   the same run already shows the filtered-down state for cross-reference).

The 24px-offset hypothesis (1) is the most likely root cause — it's a
mechanical, falsifiable mismatch in the canvas/edge-layer/card-layer
coordinate plumbing. Worth checking first.

## Acceptance criteria

- [ ] Root cause identified with a reproducible single-fixture test case
      (likely a small fixture with 3+ source columns under lineage mode).
- [ ] Edge endpoints anchor visibly to card edges in
      `metrics-overview-lineage-all-files.png` and `reports-overview.png`
      after the fix.
- [ ] A new semantic geometry assertion in `harness.test.ts` validates that
      overview edge endpoints land within a small tolerance of the
      corresponding source card right edge / target card left edge — so
      this class of regression is caught by the automated suite without
      relying on screenshot review.
- [ ] sfdc and namespaces shots remain visually correct.

## Links

- Discovered during sl-zowz (Feature 30 verification).
- Screenshot workflow that surfaced it: sl-mm7v.
- Parent epic: sl-0jva.

