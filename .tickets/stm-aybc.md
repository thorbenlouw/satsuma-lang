---
id: stm-aybc
status: closed
deps: [stm-dy6t]
links: []
created: 2026-03-16T13:46:54Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-t1n8
---
# Verify, document, and quality-gate the STM VS Code extension

Finish the VS Code highlighter with full fixture validation, local extension verification, theme checks, documentation, and scripted quality gates so it can be maintained alongside the parser work.

## Design Notes

Reference: [HIGHLIGHTING-TAXONOMY.md §4.4, §5.3, §5.4, §5.5](features/03-vscode-syntax-highlighter/HIGHLIGHTING-TAXONOMY.md)

### Test execution (taxonomy §5.3)

Run the full suite from `tooling/vscode-stm/`:

```bash
npx vscode-tmgrammar-test -s syntaxes/stm.tmLanguage.json -g test/fixtures/*.stm
npx vscode-tmgrammar-test -s syntaxes/stm.tmLanguage.json -g test/golden/*.stm
```

Both commands must be non-interactive and exit non-zero on failure. Wire into an npm script (e.g. `npm test`).

### Degradation test criteria (taxonomy §5.4)

Malformed fixtures in `test/degradation/` must not:
1. Cause the tokeniser to enter an unrecoverable state (all subsequent tokens mis-scoped)
2. Scope more than 3 lines of correct syntax after the error as unexpected scopes
3. Produce dramatically different results for incomplete-but-valid editing states

Review these manually during verification and document results. Can later be automated as reviewed snapshot tests.

### Theme verification (taxonomy §5.5)

Before release, manually verify highlighting in at least:
- **Dark+** (VS Code default dark)
- **Light+** (VS Code default light)
- **One Dark Pro** (popular community theme)

Verification checklist:
- Keywords are coloured distinctly from identifiers
- Strings are coloured
- Comments are visually de-emphasised
- Annotation and tag names are distinguishable from field names
- `//!` and `//?` comments fall back gracefully if theme does not distinguish them

### Shared fixture reuse contract (taxonomy §4.4)

Both TextMate grammar tests and Tree-sitter parser tests should validate against the same canonical STM files:

| Source | TextMate usage | Tree-sitter usage |
|---|---|---|
| `examples/*.stm` | Golden fixtures — must parse without major mis-scoping | Fixture tests via `test/fixtures/examples/*.json` |
| `test/fixtures/recovery/inputs/*.stm` | Degradation fixtures — verify acceptable fallback | Recovery corpus tests |
| Tree-sitter corpus `test/corpus/*.txt` | Derive scope assertions for isolated constructs | Primary unit test suite |

New syntax patterns added to the spec should result in: (1) new/updated `examples/*.stm`, (2) new/updated Tree-sitter corpus test, (3) corresponding TextMate scope fixture or assertion.

### Documentation requirements

The extension README should cover:
- Installation and local development workflow
- How to run scope assertion tests
- Grammar authoring format (JSON, no build step)
- Known approximation limits (reference taxonomy §3)
- Cross-link to Tree-sitter parser work and shared token mapping
- How semantic tokens will eventually layer on top

### Quality gate scripts

Add scripted checks (npm scripts or shell scripts) for:
- Extension manifest validity (`package.json` schema)
- TextMate grammar JSON validity (parseable, correct `scopeName`)
- Scope assertion test suite (`vscode-tmgrammar-test`)
- Golden fixture test suite
- Non-interactive execution (all commands exit cleanly)

## Acceptance Criteria

- All scope assertion tests in `test/fixtures/*.stm` pass via `vscode-tmgrammar-test`.
- All golden fixture tests in `test/golden/*.stm` pass without major mis-scoping.
- Degradation fixtures in `test/degradation/` satisfy the three criteria from taxonomy §5.4 — documented results exist for each file.
- Manual theme verification has been performed in Dark+, Light+, and One Dark Pro with documented results or screenshots.
- The extension README documents installation, development, test commands, known limits, and cross-links to parser work.
- Scripted quality gates exist for manifest validity, grammar JSON validity, and scope assertion tests.
- All quality gate scripts are non-interactive and exit non-zero on failure.
- Parser-related docs cross-link to the extension; extension docs cross-link to the shared token mapping in HIGHLIGHTING-TAXONOMY.md.
- The shared fixture reuse contract from taxonomy §4.4 is followed — any gaps between TextMate and Tree-sitter fixture coverage are documented.
