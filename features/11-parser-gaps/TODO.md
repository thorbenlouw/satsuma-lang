# TODO: Parser Gaps from Example Corpus

## Phase 1: Add failing corpus coverage

- [ ] Add reduced corpus tests for richer metadata values:
  - [ ] numeric defaults
  - [ ] boolean defaults
  - [ ] quoted defaults
  - [ ] dotted refs and formats
  - [ ] namespace metadata
  - [ ] filter metadata expressions
  - [ ] numeric and decimal metadata values such as `tag 1` and `error_threshold 0.02`
- [ ] Add corpus test for quoted enum entries
- [ ] Add corpus test for multi-word fragment spreads
- [ ] Add corpus test for multi-word transform spreads
- [ ] Add corpus test for a leading `note {}` before `source` and `target` in mappings
- [ ] Add corpus test for annotated `source` entries
- [ ] Add corpus test for mapping metadata such as `flatten ...` and aggregation metadata
- [ ] Add corpus test for mid-path repeated segments like `Order.LineItems[].SKU`
- [ ] Add corpus test for arithmetic pipeline steps
- [ ] Add corpus test for dotted token-call arguments
- [ ] Add corpus test for metric metadata with `source {a, b}`
- [ ] Add a decision test for adjacent strings in `note {}`

## Phase 2: Extend shared metadata grammar

- [ ] Allow metadata values to capture:
  - [ ] integers
  - [ ] decimals
  - [ ] booleans
  - [ ] dotted paths
  - [ ] backtick paths
  - [ ] two-part forms such as `namespace ord "uri"`
- [ ] Ensure `filter ...` metadata is captured structurally instead of producing recovery errors
- [ ] Ensure `tag 1` and `error_threshold 0.02` parse cleanly

## Phase 3: Extend label and spread handling

- [ ] Support multi-word bare labels after `...` for fragment spreads
- [ ] Support multi-word bare labels after `...` for transform spreads
- [ ] Verify quoted spread labels still parse

## Phase 4: Extend mapping grammar

- [ ] Allow `note_block` before `source_block` and `target_block` inside `mapping_body`
- [ ] Support annotated source entries with optional metadata
- [ ] Support richer mapping metadata values such as:
  - [ ] `flatten` with a backtick path
  - [ ] `group_by`
  - [ ] `on_error`
  - [ ] `error_threshold`

## Phase 5: Extend path grammar

- [ ] Support `[]` on intermediate path segments, not just on the final segment
- [ ] Verify mixed paths:
  - [ ] `Order.LineItems[].SKU`
  - [ ] `CartLines[].unit_price`
  - [ ] `ShipmentHeader.asnDetails[].containers`

## Phase 6: Extend pipeline grammar

- [ ] Support arithmetic steps:
  - [ ] `* N`
  - [ ] `/ N`
  - [ ] `+ N`
  - [ ] `- N`
- [ ] Support dotted token-call args such as `secrets.tax_encryption_key`
- [ ] Verify algorithm-like identifiers such as `AES-256-GCM` remain accepted where used

## Phase 7: Extend metric grammar

- [ ] Parse `source {a, b}` inside metric metadata without recovery errors
- [ ] Verify `measure additive`, `measure non_additive`, and `measure semi_additive` still parse cleanly

## Phase 8: Resolve ambiguous constructs

- [ ] Decide whether adjacent strings inside `note {}` are valid STM
- [ ] Decide whether annotated `source` entries need spec text in `STM-V2-SPEC.md`
- [ ] Update spec/examples if the final answer is “normalize the example” instead of “extend the parser”

## Acceptance Checklist

- [ ] All example files under `examples/` parse with zero errors
- [ ] Every gap listed in `PRD.md` has targeted corpus coverage
- [ ] `../../scripts/tree-sitter-local.sh test` passes in `tooling/tree-sitter-stm/`
- [ ] Any construct kept from the examples is either already documented in the spec or documented as part of this feature
