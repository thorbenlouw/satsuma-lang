---
id: stm-dy6t
status: open
deps: [stm-55vc]
links: []
created: 2026-03-16T13:46:39Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-t1n8
---
# Cover STM map syntax, paths, and edge-case highlighting

Expand the STM TextMate grammar and fixtures to handle map-heavy syntax, path forms, transform continuations, nested maps, value-map literals, and malformed editing states without catastrophic over-scoping.

## Design Notes

Reference: [HIGHLIGHTING-TAXONOMY.md §3, §5](features/03-vscode-syntax-highlighter/HIGHLIGHTING-TAXONOMY.md)

### Source vs target paths (taxonomy §3.1)

In `source_field -> target_field`, TextMate cannot determine which side of `->` an identifier falls on. **Decision**: colour both sides identically as `variable.other.field.stm`. Do not attempt left/right role colouring. This distinction is deferred to semantic tokens (`variable` + `source`/`target` modifiers).

### Dotted paths (taxonomy §3.2)

In `sfdc_account.BillingCountry`, `sfdc_account` is a schema reference and `BillingCountry` is a field. TextMate cannot distinguish these roles. **Decision**: colour the entire dotted path uniformly. Do not split the first segment into a different scope.

### Namespace qualifiers (taxonomy §3.3)

In `crm::orders.order_id`, `crm` is a namespace. TextMate can match `::` as `punctuation.separator.namespace.stm` but cannot verify the preceding token is a namespace. **Decision**: colour the `::` delimiter; let the preceding identifier take default scope. Optionally scope `identifier::` prefix differently but accept false positives.

### Value-map literal vs map block (taxonomy §3.6)

`map` can be a top-level block keyword or an inline value-map literal keyword (e.g. `map { R: "retail", ... }`). **Decision**: use parent context — `map` at top level is a declaration keyword; `map` preceded by `:` or `|` inside a map body is treated as a transform/keyword. Accept minor overlap.

### Inline note blocks on map entries (taxonomy §3.7)

A map entry may end with `{ note '''...''' }`. The trigger is `note '''` following `{`. **Decision**: use a begin/end pattern for `note '''...'''` that activates inside any brace block. Accept that the outer `{}` might occasionally be mis-scoped.

### `selection_criteria` blocks (taxonomy §3.8)

`selection_criteria '''...'''` contains SQL or other non-STM content. **Decision**: treat as a multiline string (`string.quoted.other.multiline.stm`). Do not attempt embedded SQL highlighting in the MVP.

### Fixture files for this phase

From taxonomy §5.2, this task adds:

**Focused fixtures** (`test/fixtures/`):
- `map-entries.stm` — direct, computed, nested, block map entries
- `transforms.stm` — pipelines, when/else/fallback, value maps
- `paths.stm` — dotted, relative, namespaced, array paths
- `imports.stm` — import, from, as, namespace, workspace

**Degradation fixtures** (`test/degradation/`):
- `missing-brace.stm` — unclosed block
- `unterminated-string.stm`
- `unterminated-note.stm`
- `incomplete-arrow.stm` — `field ->` with no target
- `partial-transform.stm` — `field -> target :` with no expression
- `broken-tag-list.stm` — `[pk, required` with no closing bracket

### Degradation test criteria (taxonomy §5.4)

Malformed fixtures must not:
1. Cause the tokeniser to enter an unrecoverable state (all subsequent tokens mis-scoped)
2. Scope more than 3 lines of correct syntax after the error as unexpected scopes
3. Produce dramatically different results for incomplete-but-valid editing states

These are checked manually during initial development and can later be automated as snapshot tests where the snapshot is reviewed for acceptable degradation.

## Acceptance Criteria

- Map headers with optional source/target block references are highlighted correctly.
- Direct mappings (`src -> tgt`) highlight both sides as `variable.other.field.stm` and the arrow as `keyword.operator.arrow.stm`.
- Computed mappings (`=> tgt : expression`) highlight the fat arrow, target identifier, and transform separator correctly.
- Nested map blocks (`src[] -> tgt[] { ... }`) highlight the array markers, arrow, and block delimiters.
- Transform heads after `:` are highlighted; pipeline continuation lines beginning with `|` scope the pipe as `keyword.operator.pipe.stm`.
- `when`, `else`, and `fallback` continuation lines scope their keywords as `keyword.control.conditional.stm`.
- Value-map literals (`map { key: value, ... }`) are scoped differently from top-level map blocks by parent context.
- Path syntax (dotted, relative, array segments, backtick segments) is highlighted uniformly without attempting role disambiguation.
- Inline note blocks (`{ note '''...''' }`) on map entries are scoped as documentation.
- `selection_criteria '''...'''` is scoped as a multiline string without embedded language highlighting.
- All focused and degradation fixture files listed above exist with scope assertions or documented degradation snapshots.
- Degradation fixtures satisfy the three criteria from taxonomy §5.4: no unrecoverable state, ≤3 lines of residual mis-scoping, no dramatic editing-state artifacts.
- Canonical examples (`test/golden/`) parse without major mis-scoping after this phase.
- Any syntax areas that remain approximate are documented as comments near the grammar patterns or in the fixture files.
