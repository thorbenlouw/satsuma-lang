# VS Code Satsuma Extension

Syntax highlighting for the Satsuma language.

## Installation (local development)

```bash
# Install dev dependencies
cd tooling/vscode-satsuma
npm install

# Load the extension in VS Code:
# 1. Open the repo root in VS Code
# 2. Run "Developer: Install Extension from VSIX..." OR
# 3. Press F5 (with the Extension Development Host launch config)
```

## Running Tests

From `tooling/vscode-satsuma/`:

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
regex-only matching. See `features/07-vscode-syntax-highlighter-v2/HIGHLIGHTING-TAXONOMY.md §14`
for the full list. Key limitations:

- **`source` / `target` as keywords vs. field names** (§14): Both are scoped as
  keywords everywhere. A parser can distinguish them by block context.
- **`map` as keyword vs. field name** (§14): `map` is highlighted as a keyword
  everywhere. In practice field names of `map` are uncommon.
- **`list` / `record` as keywords vs. field names** (§14): Highlighted as keywords
  inside schema bodies — minor overlap possible for fields named `list` or `record`.
- **Pipeline tokens as field names** (§14): `trim`, `filter`, `format` etc. could
  be field names but are only highlighted as pipeline tokens inside `{}` arrow bodies.
- **Vocabulary tokens as field names** (§14): Constraint/format tokens (`filter`,
  `format`) are only matched inside `()` metadata blocks, reducing false positives.
- **Type names vs. field names** (§14): An all-caps field like `STATUS CHAR(1)` —
  `STATUS` is matched as a type by position (second token in declaration). Parser
  needed for precise disambiguation.

## Semantic Tokens (Future Work)

Parser-backed semantic tokens are planned as a follow-on to resolve the approximation
limits above. Candidates from the taxonomy (§14):

- `source` / `target` — distinguish keyword (inside `mapping {}`) from field name (inside `schema {}`)
- `map` — distinguish value-mapping block keyword from field identifier
- `list` / `record` — distinguish structural keywords from field names
- Type-position identifiers — confirm second token in declaration is a type, not a field

Dependencies: tree-sitter-stm grammar stable, CST-to-AST mapping defined.

## Shared Token Mapping

The TextMate scopes in this extension align with the token taxonomy defined in
`features/07-vscode-syntax-highlighter-v2/HIGHLIGHTING-TAXONOMY.md`. The full
scope summary is in §15 of that document.

New syntax patterns should produce:

1. An updated example `.stm` file in `test/fixtures/`
2. A corresponding TextMate scope fixture test

## Theme Verification

Before releases, verify highlighting in:

- **Dark+** (VS Code default dark)
- **Light+** (VS Code default light)
- **One Dark Pro** (popular community theme)

Checklist:

- [ ] Keywords (`schema`, `mapping`, `fragment`, `record`, `list`, `transform`, `note`) coloured distinctly from identifiers
- [ ] `import` / `from` coloured as control-flow keywords
- [ ] Strings (double-quoted NL, triple-quoted Markdown, single-quoted labels, backtick identifiers) each coloured
- [ ] Comments visually de-emphasised
- [ ] Vocabulary tokens in `()` metadata (`pk`, `required`, `pii`, `enum`, `format`) distinguishable from field names
- [ ] Pipeline function tokens (`trim`, `lowercase`, `coalesce`) highlighted inside `{}` bodies
- [ ] `//!` and `//?` fall back gracefully in themes that don't distinguish them
