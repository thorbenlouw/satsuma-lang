# Feature 20 — `satsuma fmt` — Task Breakdown

## Phase 1: Core Formatter + CLI Command

### 1.1 Core formatter scaffolding
Implement the `format(tree, source)` pure function skeleton in `tooling/satsuma-cli/src/format.ts`. Set up the CST walk over `node.children` (not just `namedChildren`) to handle all node types including anonymous tokens and comments. Emit unformatted source as a baseline (pass-through) and wire up basic tests proving round-trip works.

### 1.2 Schema and fragment block formatting
Implement formatting for `schema_block` and `fragment_block` nodes: indentation, opening/closing braces, block metadata (single-line and multi-line), and the two-pass field column alignment (name, type, metadata columns with caps at 24/14). Handle fragment spreads (`...name`) as non-aligned standalone lines.

### 1.3 Mapping block formatting
Implement formatting for `mapping_block` nodes: `source`/`target` sub-blocks (single-line and multi-line), arrow declarations (simple, with inline transform, computed with NL body), pipe chains, `each`/`flatten` nested structures, and `note` sub-blocks within mappings.

### 1.4 Transform, metric, note, and import formatting
Implement formatting for `transform_block`, `metric_block`, `note_block`, and `import_decl` nodes. These are simpler block types that follow the same brace/indentation rules.

### 1.5 Comment and blank line handling
Implement comment preservation (all three types: `//`, `//!`, `//?`), inline trailing comments with 2-space gap, section-header comment preservation, comment-to-block attachment (pull tight), and blank line normalisation (2 between top-level blocks, collapse consecutive blanks to 1 within blocks, no trailing blanks).

### 1.6 CLI `fmt` command
Implement `tooling/satsuma-cli/src/commands/fmt.ts`: file/directory resolution, recursive `.stm` discovery, `--check`, `--diff`, `--stdin` flags, exit codes (0/1/2), and parse-error file skipping with warnings.

### 1.7 Core formatter tests
Unit tests for every block type, field alignment, comment handling, blank line rules, single-line vs multi-line decisions, edge cases (deeply nested records, long metadata, inline comments at alignment boundaries, empty blocks). Use example corpus as golden fixtures. Add round-trip structural equivalence tests.

### 1.8 Exploratory testing and corpus validation
Run `satsuma fmt --check` against all `examples/*.stm` files. Fix any formatting divergence. Run the formatter against deliberately messy/agent-generated `.stm` files. Document any surprising results. Ensure idempotency across the full corpus.

## Phase 2: VS Code Integration

### 2.1 LSP DocumentFormattingProvider
Register `DocumentFormattingProvider` in the VS Code LSP server. Wire the shared `format()` function (adapted for web-tree-sitter WASM) into the handler. Return `TextEdit[]` replacing the full document. Verify format-on-save works with standard VS Code settings.

### 2.2 VS Code formatting tests
Test that Format Document in VS Code produces identical output to the CLI. Test format-on-save. Test with parse-error files (should not crash or corrupt).

## Phase 3: CI + Documentation

### 3.1 CI integration
Add `satsuma fmt --check` step to the CI pipeline. Format the entire example corpus and commit (should be a no-op).

### 3.2 Documentation updates
Update `SATSUMA-CLI.md` with the `fmt` command reference. Update `AI-AGENT-REFERENCE.md` with formatter guidance for agents. Update `PROJECT-OVERVIEW.md` if architecture description needs it. Update landing page / site to mention the formatter.
