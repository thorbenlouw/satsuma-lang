# VS Code STM Extension

Syntax highlighting for the Semantic Transform Model (STM) language.

## Installation (local development)

```bash
# Install dev dependencies
cd tooling/vscode-stm
npm install

# Load the extension in VS Code:
# 1. Open the repo root in VS Code
# 2. Run "Developer: Install Extension from VSIX..." OR
# 3. Press F5 (with the Extension Development Host launch config)
```

## Running Tests

From `tooling/vscode-stm/`:

```bash
# Run all tests
npm test

# Focused fixture tests only
npm run test:fixtures

# Golden fixture tests only
npm run test:golden

# Validate manifest + grammar JSON
npm run validate

# Run everything (validate + test)
npm run check
```

Tests use [`vscode-tmgrammar-test`](https://github.com/nicolo-ribaudo/vscode-tmgrammar-test),
which runs without a VS Code instance (CI-safe) and exits non-zero on failure.

## Grammar Authoring

The grammar is in `syntaxes/stm.tmLanguage.json` — plain JSON, no build step.
This is a standard TextMate grammar. Edit it directly; reload the Extension
Development Host to preview changes.

## Known Approximation Limits

The TextMate grammar handles several constructs approximately due to
regex-only matching. See `features/03-vscode-syntax-highlighter/HIGHLIGHTING-TAXONOMY.md §3`
for the full list. Key limitations:

- **Source vs target paths** (§3.1): Both sides of `->` get `variable.other.field.stm`.
  Semantic tokens will add `source`/`target` modifiers.
- **Dotted paths** (§3.2): `schema.field` coloured uniformly — parser needed to
  distinguish schema ref from field ref.
- **Namespace qualifier** (§3.3): `::` is matched but preceding identifier not verified
  as a namespace.
- **Soft keywords** (§3.4): `namespace` and `workspace` are scoped as keywords only in
  declaration-head position; uses are approximate.
- **Function calls in transforms** (§3.5): Only `name(` patterns scoped as function
  calls; bare pipe-chain identifiers stay as `variable.other.field.stm`.
- **`map` keyword** (§3.6): Top-level `map` vs inline value-map literal distinguished
  by context — minor overlap possible.

## Semantic Tokens (Future Work)

Parser-backed semantic tokens are planned as a follow-on to resolve the approximation
limits above. See `features/03-vscode-syntax-highlighter/SEMANTIC-TOKENS-DESIGN.md`
for the full design.

Dependencies: tree-sitter-stm grammar stable (stm-14x), CST-to-AST mapping defined.

## Shared Token Mapping

The TextMate scopes in this extension align with the Tree-sitter `highlights.scm`
captures defined in `tooling/tree-sitter-stm/queries/highlights.scm`. The full
correspondence table is in `HIGHLIGHTING-TAXONOMY.md §4.1`.

New syntax patterns should produce:
1. An updated `examples/*.stm` file
2. A new/updated Tree-sitter corpus test
3. A corresponding TextMate scope fixture

## Theme Verification

Before releases, verify highlighting in:
- **Dark+** (VS Code default dark)
- **Light+** (VS Code default light)
- **One Dark Pro** (popular community theme)

Checklist:
- [ ] Keywords coloured distinctly from identifiers
- [ ] Strings coloured
- [ ] Comments visually de-emphasised
- [ ] Annotation and tag names distinguishable from field names
- [ ] `//!` and `//?` fall back gracefully in themes that don't distinguish them
