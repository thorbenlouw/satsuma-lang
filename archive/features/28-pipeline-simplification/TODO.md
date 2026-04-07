# Feature 28 TODO

PRD: [PRD.md](./PRD.md)

This TODO breaks Feature 28 into implementation tasks mirrored as `tk` tickets.
Each task refers back to the PRD and should only be closed once its code, tests,
and documentation obligations are complete.

## Epic

`sl-m2s6` — Feature 28: pipeline simplification — all pipe steps are NL

## Task Breakdown

### 1. Grammar simplification

Ticket: `sl-3tv5`

Simplify the tree-sitter grammar so every token sequence between pipe delimiters
is a plain NL step. Remove arithmetic operator rules (`* + - /` as pipe step
content) and function-call sub-rules from `pipe_text`. After this change,
`round(2)`, `split("/")`, and `* 100` are NL text with no special CST node type.

Scope:

- remove arithmetic operator rules from `pipe_text`
- remove function-call sub-rules from `pipe_text`
- regenerate parser artifacts
- update corpus tests: structural/function-call tests become NL tests
- add new corpus tests for bare tokens, arithmetic-style text, and
  function-call-style text as NL

PRD reference:

- Scope of Changes / Grammar
- Acceptance Criteria items 1, 5

**This ticket has no dependencies — it is the root of the feature.**

---

### 2. Core: remove structural/mixed classifications

Ticket: `sl-95f9`
Depends on: `sl-3tv5`

Update `classify.ts` so it returns only `none`, `nl`, or `nl-derived`. Remove
the `structural` and `mixed` return paths and the Classification type variants.
Simplify `decomposePipeSteps()` in `extract.ts` (all steps are NL text, no
step-type distinction) and `isInlinePipeChain()` in `format.ts` (NL-presence
heuristic is moot when all chains are NL).

Scope:

- `classify.ts`: remove `structural` and `mixed`; update Classification type
- `extract.ts`: simplify `decomposePipeSteps()`
- `format.ts`: simplify `isInlinePipeChain()`
- all `satsuma-core` unit tests updated

PRD reference:

- Scope of Changes / Core extraction
- Acceptance Criteria items 1, 4

---

### 3. Viz model: narrow TransformInfo.kind

Ticket: `sl-sp7g`
Depends on: `sl-95f9`

Narrow `TransformInfo.kind` from `"pipeline" | "nl" | "mixed" | "map"` to
`"nl" | "map"`. Remove or simplify `TransformInfo.steps` so all step content
is NL text in the `text` field.

This is a breaking contract change — all consumers (viz rendering, LSP,
viz-backend) will fail to compile until their respective tickets are applied.

Scope:

- `satsuma-viz-model/src/index.ts`: narrow the `kind` union
- simplify `TransformInfo.steps` shape
- update viz-model contract tests

PRD reference:

- Scope of Changes / Viz model

---

### 4. CLI: remove structural/mixed from all command outputs

Ticket: `sl-cxei`
Depends on: `sl-95f9`

Update all CLI commands that emit a `classification` field. Update the `nl`
command to return ALL pipe step content including bare tokens. Update the
TypeScript `Classification` type.

Scope:

- `arrows`, `field-lineage`, `graph`, `mapping`: update JSON output and tests
- `nl`: update to return all pipe step content
- `types.ts`: remove `structural` and `mixed` from Classification type
- all CLI tests updated with new expected outputs

PRD reference:

- Scope of Changes / CLI
- Acceptance Criteria items 2, 3

---

### 5. LSP: simplify coreClassificationToVizKind and extractTransform

Ticket: `sl-owen`
Depends on: `sl-sp7g`, `sl-95f9`

Simplify the LSP and viz-backend so they reflect the collapsed classification.
Remove the `structural` → `pipeline` and `mixed` → `mixed` mapping branches.
Update semantic token scopes for pipe steps.

Scope:

- `viz-model.ts`: simplify `coreClassificationToVizKind()` and `extractTransform()`
- semantic token provider: pipe step tokens get a uniform NL scope
- `satsuma-lsp` tests updated

PRD reference:

- Scope of Changes / LSP

---

### 6. Viz rendering: remove pipeline/mixed branches and orange edge colour

Ticket: `sl-thqe`
Depends on: `sl-sp7g`

Remove the separate rendering branches for `"pipeline"` and `"mixed"` transform
kinds in the viz renderer. All transform edges render as NL style.

Scope:

- `sz-edge-layer.ts`: remove pipeline/mixed conditional; remove
  `--sz-edge-pipeline` CSS variable
- `sz-mapping-detail.ts`: remove pipeline/mixed step rendering branch
- `sz-overview-edge-layer.ts`: remove pipeline-specific stroke style
- layout test fixtures: `kind: "pipeline"` → `kind: "nl"`

PRD reference:

- Scope of Changes / Viz rendering

---

### 7. VS Code: remove ClassificationFilter dropdown and structural CSS

Ticket: `sl-uu90`
Depends on: `sl-95f9`, `sl-sp7g`

Remove the classification filter UI from the VS Code field-lineage webview.
Simplify the lineage webview and semantic token provider.

Scope:

- `field-lineage.ts`: remove `ClassificationFilter` type, dropdown, and
  `keepClassification()`
- `field-lineage.css`: remove `.cls-structural` rules; simplify arrowhead
  markers to `none`, `nl`, `nl-derived` only
- `lineage.ts`: remove the `isNl` check
- semantic tokens: pipe steps get uniform NL scope

PRD reference:

- Scope of Changes / VS Code extension
- Acceptance Criteria item 6

---

### 8. Spec and docs: reframe pipeline tokens as vocabulary conventions

Ticket: `sl-nk6g`
Depends on: `sl-cxei`, `sl-thqe`, `sl-uu90`

Update the spec and all CLI/agent reference docs to reflect the simplified model.

Scope:

- `SATSUMA-V2-SPEC.md`: rewrite sections 4.2, 5.2, 7.2 — rename "Pipeline
  Tokens" section to "Vocabulary Conventions", explain these are NL shorthand
- `SATSUMA-CLI.md`: update transform classification table
- `AI-AGENT-REFERENCE.md`: update for correct agent guidance

PRD reference:

- Scope of Changes / Spec and docs
- Acceptance Criteria item 7

---

### 9. Examples: update canonical corpus to idiomatic post-simplification style

Ticket: `sl-bbuh`
Depends on: `sl-3tv5`

Audit and update canonical examples. Arithmetic-operator-style steps must be
rewritten as NL prose. Function-call-style steps should be reviewed for clarity.
At least one example should showcase idiomatic simplified style.

Scope:

- remove or rewrite all `{ * N }` arithmetic-operator steps
- review `round(2)`, `parse("...")`, etc. for prose clarity
- ensure all examples still parse without errors
- at least one example demonstrates clean post-simplification NL style

PRD reference:

- Scope of Changes / Canonical examples
- Acceptance Criteria item 5

---

## Dependency Graph

```
sl-3tv5  grammar simplification
│
├── sl-95f9  core classify.ts
│   ├── sl-sp7g  viz-model kind narrowing
│   │   ├── sl-owen   LSP + viz-backend
│   │   ├── sl-thqe   viz rendering ──┐
│   │   └── sl-uu90   VS Code ext  ──┤
│   │                                 │
│   └── sl-cxei  CLI output  ─────────┤
│                                     │
│                             sl-nk6g  spec + docs
│
└── sl-bbuh  examples update
```

## Implementation Notes

- Tasks 1–4 touch the most code and should land in order. Tasks 5–7 (`sl-owen`,
  `sl-thqe`, `sl-uu90`) can proceed in parallel once `sl-sp7g` and `sl-95f9`
  are done.
- Task 8 (spec/docs) should be done last — it documents the final state, not
  an intermediate one.
- Task 9 (examples) can proceed in parallel with tasks 2–8 once the grammar
  is done.
- All existing `.stm` files are **backward compatible** — the change is purely
  in how the tooling classifies and renders steps.
- The only breaking change visible to external consumers is the JSON output
  contract (`classification` field, `TransformInfo.kind`). Note this in the
  PR description.
- Close deferred tickets `sl-xy4s` and `sl-lzcp` as **superseded** after the
  epic closes — those classification bugs become moot once structural is removed.
- Issue ADR-023 (Pipeline Simplification: All Pipe Steps Are NL) as part of
  this feature, per the PRD's related items.
