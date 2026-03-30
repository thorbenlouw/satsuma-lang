---
id: sl-inqs
status: closed
deps: [sl-via3, sl-ewyv, sl-o4by, sl-d0je, sl-idw9, sl-p6nd, sl-ys4h, sl-4afx, sl-i2k9, sl-fiqs]
links: []
created: 2026-03-30T18:25:34Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-jvwu
tags: [core, cli, lsp]
---
# test: consolidate extraction test coverage into core, remove consumer duplicates

Once extraction logic is consolidated in core (dependent tickets), the test suites need rationalization:

1. **Core tests** should comprehensively cover all extraction, classification, metadata, spread expansion, NL ref, and string utility logic. These are the authoritative tests.
2. **CLI tests** should cover only: adapter/wiring (shim functions), CLI-specific features (lint rules, diff, graph building, output formatting), and integration tests (file -> parse -> index -> command output).
3. **LSP tests** should cover only: adapter/wiring (DefinitionEntry construction, VizModel building from core types), LSP-specific features (go-to-definition, completions, hover, CodeLens, semantic tokens), and integration tests.

**Work:**
1. Audit all three test suites for extraction tests that belong in core.
2. Move extraction tests from CLI and LSP to core where not already covered.
3. Delete consumer tests that merely retest core behaviour.
4. Ensure core test coverage is comprehensive — no extraction edge case should be tested only in a consumer.
5. Verify no coverage gaps: every extraction function in core has targeted tests; every consumer adapter has targeted tests.
6. Update test descriptions to follow AGENTS.md standards: named by behaviour, purpose comments, minimal inputs.

**Validation before PR:**
- All three test suites pass
- Core test count increased; consumer test counts stable or decreased
- No extraction logic tested only in consumers
- Code meets AGENTS.md test quality standards

## Acceptance Criteria

- Extraction tests consolidated in core test suite
- CLI tests cover only CLI-specific concerns
- LSP tests cover only LSP-specific concerns
- No redundant extraction tests across suites
- All tests follow AGENTS.md naming and quality standards

