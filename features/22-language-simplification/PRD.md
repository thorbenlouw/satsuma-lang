# Feature 22 — Language Simplification

> **Status: DRAFT**

## Goal

Simplify the Satsuma language surface and CLI output to eliminate entire classes of bugs discovered through 300+ tickets of exploratory testing. The grammar currently has ~45 rules for metadata/transforms/paths with 13 distinct metadata value forms — far more complexity than a language whose parser is an LLM needs. This feature reduces the grammar to its structural essentials, unifies quoting, normalizes output references, adds multi-source arrows, and elevates NL `@ref` references to structural sources.

---

## Problem

The DISCOVERED-REQUIREMENTS.md audit identified 48 latent requirements, most stemming from unnecessary grammar and output complexity:

1. **Inconsistent field references.** Different commands emit bare names (`customer_id`), schema-qualified (`crm_customers.customer_id`), or namespace-qualified (`crm::crm_customers.customer_id`) for the same field. Downstream consumers comparing output across commands get silent mismatches.

2. **Over-specified grammar.** The metadata grammar parses 13 value forms (boolean, numeric, dotted, comparison, ref-on compound, etc.) but Satsuma doesn't care about types — metadata is string data for the agent to reason about. Every distinct grammar rule is a CST node type that every CLI command must handle, and every missed case is a bug.

3. **Three quote types.** Single quotes for labels, double quotes for NL, backticks for identifiers. Single quotes appear only after keywords and nowhere else — they add a third quoting convention for minimal benefit. Users write `schema "my schema"` (wrong quotes) and get a parse error.

4. **No multi-source arrows.** When a target field derives from multiple source fields, there's no way to express it at arrow level. The current workaround is a prose NL description, which breaks field-level lineage precision.

5. **NL refs are second-class.** Backtick references in NL strings (`` "Look up `dim_customer`" ``) are informational only. The graph and lineage commands ignore them. But they represent real data dependencies that users expect to see in lineage output. Additionally, backticks inside NL are ambiguous — is `` `order-headers` `` a structural cross-reference or cosmetic Markdown code-span formatting?

6. **Pipe step ceremony.** Transform pipe chains require quotes around NL text (`"Convert to uppercase" | trim`), but since the CLI doesn't execute any of it — `trim` and `"Convert to uppercase"` are both just text for the agent — the quotes are unnecessary ceremony.

---

## Design Decisions

### D1: Canonical field reference form

All CLI output (JSON and text) emits fully-qualified field references:

| Workspace has namespaces? | Form |
|---------------------------|------|
| No | `::schema.field` |
| Yes | `namespace::schema.field` |

The `::` prefix on unscoped schemas is visually distinct, machine-parseable, and never ambiguous. A shared `canonicalRef()` utility produces this form everywhere.

### D2: Two quote types only

| Type | Syntax | Purpose |
|------|--------|---------|
| Backticks | `` `...` `` | Identifiers and names that aren't bare-safe |
| Double quotes | `"..."` / `"""..."""` | Natural language content |

Single quotes are removed. `schema 'my schema'` becomes `` schema `my schema` ``. This reduces the mental model to: "backticks for names, quotes for prose."

#### When backticks are required vs optional

**Bare identifiers** matching `[a-zA-Z_][a-zA-Z0-9_-]*` never need backticks:

```stm
schema customers { ... }              // bare — simple name
mapping load_customers { ... }        // bare — underscores are fine
Lead_Source__c STRING                  // bare — double underscores are fine
transform normalize { ... }           // bare
...audit_fields                       // bare spread
source { orders, crm_customers }      // bare source refs
```

**Backticks** are required when the name contains spaces, dots, or other special characters:

```stm
schema `order-headers-parquet` { ... }   // hyphen in name
mapping `customer migration` { ... }     // space in name
`Account.Name` STRING                    // dot in name (single field, not a path)
...`US Address`                          // space in spread label
source { `order-headers` }               // hyphen in source ref
```

**In dotted paths**, backticks wrap individual segments, not the whole path. The dot lives outside any quoting:

```stm
schema.field                          // both segments bare
`order-headers`.field                 // first segment needs backticks
schema.`Account.Name`                 // second segment has a literal dot in its name
`order-headers`.`Account.Name`        // both segments need backticks
```

`` `schema.field` `` (whole path in one backtick pair) means "a single identifier whose name literally contains a dot" — it is NOT a path with two segments. This follows the SQL convention: `"my schema"."my column"`, not `"my schema.my column"`.

**Inside NL strings**, structural cross-references use the `@` prefix — like a GitHub/Slack mention. Backticks in NL are inert cosmetic markup (like Markdown code spans) with no structural meaning:

```stm
field -> target { Look up @customers.email in the dim table }
field -> target { Apply @normalize then check @crm::legacy.status }
field -> target { See @`order-headers`.status for edge cases }
```

After `@`, the same path and quoting rules apply — dots are path separators, backticks wrap segments with special chars. An `@` ref ends at the first character that isn't part of a valid path (whitespace, punctuation other than `.`, `::`, or backtick pairs). Refs can point to schemas, fields, mappings, transforms, fragments, or spreads.

`@` is **required** in NL strings (pipe text, `"..."`, `"""..."""`) for tooling to detect structural refs. It is **optional but allowed** everywhere else (source blocks, arrow sources, metadata values, etc.) — `@customers` resolves identically to `customers`. This means users who over-apply `@` get correct code; users who forget it in NL get a lint warning. Literal `@` in NL where it should NOT be a ref (rare) is escaped: `\@`.

**One rule for agents: prefix field, schema, or transform names with `@` when you reference them in NL text — like a GitHub mention.**

**One rule for names: bare names work when the name matches `[a-zA-Z_][a-zA-Z0-9_-]*`. Everything else gets backticks.**

The formatter (`satsuma fmt`) auto-adds backticks to names that need them and strips unnecessary ones.

### D3: Simplified metadata grammar

The 13 `_kv_value` forms collapse to greedy text capture. Only three metadata entry types retain structured grammar rules:

| Entry | Why structured |
|-------|----------------|
| `enum { ... }` | Brace matching required |
| `slice { ... }` | Brace matching required |
| `note "..." / note """..."""` | CLI extracts notes specifically |

Everything else is `tag_name [value_text]`, where `value_text` consumes tokens up to the next `,` or `)`. No depth tracking, no external scanner — just a simple greedy rule. If a metadata value itself contains a comma, wrap it in double quotes.

**Before (13 forms):**
```
_kv_value := nl_string | multiline_string | backtick_name | kv_braced_list
           | kv_comparison | kv_ref_on | kv_compound | qualified_dotted_name
           | dotted_name | number_literal | boolean_literal | qualified_name
           | identifier
```

**After (simple greedy rule + 3 structured):**
```
_metadata_entry := enum_body | slice_body | note_tag | tag_with_value | tag_token
tag_with_value  := identifier value_text
value_text      := repeat1(choice(identifier, number, nl_string, multiline_string,
                                   backtick_name, dotted_name, operator_chars))
```

The `value_text` rule is a `repeat1` of simple token types — no external scanner needed. Commas and closing parens naturally terminate it because they're not in the choice set. Values containing commas must be quoted: `(note "apples, oranges")` not `(note apples, oranges)`.

### D4: Implicit NL in pipe steps

Pipe step content between `|` delimiters is implicitly NL text — no quotes required. Double quotes remain available when the text contains literal `|` or `}` characters.

**Before:**
```stm
field -> target { "Convert to uppercase" | trim | "Handle nulls" | coalesce(0) }
```

**After:**
```stm
field -> target { Convert to uppercase | trim | Handle nulls | coalesce(0) }
```

The pipe step grammar becomes:

```
pipe_step := fragment_spread       // ...name(args) — structural, for IDE nav
           | map_literal           // map { ... } — structural, brace matching
           | pipe_text             // everything else — greedy text
```

The `arithmetic_step`, `token_call`, and `_tc_arg` rules are removed — they're all just text now.

Structural cross-references inside pipe text use `@ref` syntax (e.g., `Convert @amount to USD`) and are extracted for NL-ref resolution and IDE features. Backticks in pipe text are inert.

### D5: Multi-source arrow syntax

New syntax for arrows with multiple source fields:

```stm
a, b, c -> target { a + b + c | Concatenate and uppercase }
orders.amount, rates.fx_rate -> amount_usd { Multiply amount by fx_rate }
```

Source fields can be bare (resolved from mapping's declared sources) or schema-qualified (required when ambiguous in multi-source mappings). The grammar extends `map_arrow` to accept `commaSep1($.src_path)` instead of a single `$.src_path`.

In the extracted data model, `ArrowRecord.sources` becomes `string[]` (always an array; single-source arrows have length 1). The graph emits one edge per source field.

### D6: NL refs are structural sources

`@ref` references in NL strings that resolve to schemas or fields are structural data dependencies, not informational asides. The contract:

1. The `hidden-source-in-nl` lint rule becomes an **error** (was: warning).
2. The auto-fix adds undeclared refs to the left side of a multi-source arrow, or to the mapping's `source { }` block.
3. The graph and lineage commands treat `@ref` mentions as first-class edges (safe because lint guarantees they're declared).

**Before (informational):**
```stm
field -> target { "Add to `other_field`" }
// lint: warning — other_field not in source list
// graph: no edge from other_field
```

**After (structural):**
```stm
other_field, field -> target { Add to @other_field }
// lint: passes — other_field declared on left
// graph: edge from other_field to target
```

### D7: Unified escaping

One rule: **backslash escapes the next character.** Applies identically inside backticks and double quotes:

| Escape | Result | Where |
|--------|--------|-------|
| `\"` | Literal `"` | Inside `"..."` |
| `` \` `` | Literal `` ` `` | Inside `` `...` `` |
| `\@` | Literal `@` | Inside NL strings (prevents `@` from starting a ref) |
| `\\` | Literal `\` | Everywhere |
| `\n`, `\t`, etc. | Literal `n`, `t`, etc. (no special sequences) |

`\@` is needed for the rare case where `@` appears in NL prose but should not be treated as a structural reference (e.g., email addresses). In practice this is uncommon — `@` followed by something that doesn't match an identifier is already inert.

Triple-quoted strings (`"""..."""`) do not need `\"` escaping. `\@` works the same in both quote forms.

### D8: Duplicate metadata tags

Allowed. No grammar or lint enforcement. `(note "Potato", note "Apple")` produces two entries. This is intentional — multiple notes, multiple annotations of the same tag, are valid use cases.

### D9: Map entry simplification

Map entries become `LEFT_TEXT : RIGHT_TEXT` with greedy text capture:

```
map_entry := map_key_text ":" map_value_text
```

The 7 structured map key types (`identifier`, `nl_string`, `number`, `_`, `null`, `default`, comparison expressions) and 5 map value types are replaced by greedy scanners. The CLI doesn't evaluate map logic — it extracts the text for the agent.

---

## Non-Goals

- **Executing transforms.** Satsuma transforms are text for agents. The CLI never evaluates `trim`, `coalesce(0)`, or arithmetic expressions.
- **Type checking metadata.** `(format E.164)` and `(format 42)` are both valid — the grammar doesn't distinguish.
- **Sorting or reordering.** No auto-sorting of sources, fields, or arrows.
- **Backwards compatibility shims.** Single-quote support is removed, not deprecated. A migration tool handles conversion.

---

## Implementation Phases

### Phase 1 — Canonical Field References

**Scope:** CLI only. No grammar changes. Non-breaking.

Introduce a shared `canonicalRef(namespace, schema, field?)` utility that all commands use. Update all 16 command files to emit `[ns]::schema.field` in JSON and text output. Update the workspace index to store qualified keys.

**Key files:**
- `tooling/satsuma-cli/src/extract.ts` — `pathText()`, `extractArrowRecords()`
- `tooling/satsuma-cli/src/index-builder.ts` — qualified key storage
- `tooling/satsuma-cli/src/commands/*.ts` — all output paths
- `tooling/satsuma-cli/src/nl-ref-extract.ts` — ref classification

**Parallelizable with:** Phase 2.

### Phase 2 — Multi-Source Arrow Syntax

**Scope:** Grammar + CLI. Non-breaking (additive).

Extend `map_arrow` in the grammar to accept comma-separated source paths. Update extraction to produce `sources: string[]`. Update arrows, mapping, graph, lineage, and validate commands.

**Key files:**
- `tooling/tree-sitter-satsuma/grammar.js` — `map_arrow` rule
- `tooling/tree-sitter-satsuma/test/corpus/` — new `multi_source_arrows.txt`
- `tooling/satsuma-cli/src/extract.ts` — multi-source extraction
- `tooling/satsuma-cli/src/types.ts` — `ArrowRecord.sources`
- `tooling/satsuma-cli/src/commands/arrows.ts`, `mapping.ts`, `graph.ts`, `lineage.ts`, `validate.ts`
- `SATSUMA-V2-SPEC.md` — syntax documentation
- `examples/` — canonical multi-source example

**Parallelizable with:** Phase 1.

### Phase 3 — Grammar Simplification

**Scope:** Grammar + CLI + VS Code. Breaking for CST consumers (not for .stm source files).

#### 3a: Metadata simplification
Replace 13 `_kv_value` choices with a simple `value_text` rule (repeat of basic token types — identifiers, numbers, strings, backtick names, dotted names, operator chars). Commas and `)` naturally terminate the rule. No external scanner needed. Keep `enum_body`, `slice_body`, `note_tag` as structured rules. Remove `key_value_pair`, `kv_key`, `kv_braced_list`, `kv_comparison`, `kv_ref_on`, `kv_compound`.

#### 3b: Pipe step simplification (implicit NL)
Replace `pipe_step` choices with `fragment_spread | map_literal | pipe_text`. Remove `arithmetic_step`, `token_call`, `_tc_arg`. The `pipe_text` rule is a `repeat1` of basic tokens (identifiers, numbers, backtick names, operator chars, etc.) — `|` and `}` naturally terminate it because they're not in the token set. Double quotes still work for text containing literal `|` or `}`. Update NL-ref extraction to scan for `@ref` mentions (replacing backtick scanning) in both quoted and bare pipe text.

#### 3c: Map entry simplification
Replace structured `map_key`/`map_value` with simple token-repeat rules. Map keys consume until `:`, map values consume until `,` or `}`. Same pattern as metadata — no external scanner, just natural termination by excluded delimiters.

#### 3d: Unified escaping
Ensure `backtick_name` and `nl_string` use identical `\\[\\s\\S]` escape pattern. Document: "backslash escapes the next character."

**Key files:**
- `tooling/tree-sitter-satsuma/grammar.js` — rule rewrites
- `tooling/tree-sitter-satsuma/test/corpus/simplified_metadata.txt` — new corpus tests for simplified forms
- `tooling/tree-sitter-satsuma/test/corpus/*.txt` — rewrite CST expectations
- `tooling/satsuma-cli/src/meta-extract.ts` — simpler extraction from `tag_with_value`
- `tooling/satsuma-cli/src/extract.ts` — pipe step classification
- `tooling/satsuma-cli/src/nl-ref-extract.ts` — switch from backtick regex to `@ref` extraction
- `tooling/vscode-satsuma/server/src/*.ts` — update CST node type references
- `tooling/vscode-satsuma/syntaxes/satsuma.tmLanguage.json` — TextMate patterns

**Migration:** No `.stm` file changes needed — the grammar becomes more permissive. Only tooling code that pattern-matches on removed CST node types needs updating.

**Sequential with:** Phase 4 (both rewrite grammar.js).

### Phase 4 — Unify Quotes (Drop Single Quotes)

**Scope:** Grammar + CLI + VS Code + examples. Breaking for `.stm` source files.

Replace `quoted_name` (single-quote) with `backtick_name` in all label positions. Remove the `quoted_name` rule. Update all example files, corpus tests, CLI extraction, formatter, and VS Code extension.

**Key files:**
- `tooling/tree-sitter-satsuma/grammar.js` — `block_label`, `import_name`, `spread_label`
- `tooling/tree-sitter-satsuma/test/corpus/*.txt` — replace `'label'` with `` `label` ``
- `tooling/satsuma-cli/src/extract.ts` — `labelText()` function
- `tooling/satsuma-cli/src/format.ts` — label rendering
- `tooling/vscode-satsuma/syntaxes/satsuma.tmLanguage.json` — label patterns
- `tooling/vscode-satsuma/server/src/*.ts` — `quoted_name` references
- `examples/*.stm` — migrate all single-quoted labels
- `SATSUMA-V2-SPEC.md` — sections 2.2, 2.3

**Migration tool:** `satsuma fmt` auto-converts `'label'` to `` `label` `` as part of standard formatting. Run on all example files before landing.

**Sequential after:** Phase 3.

### Phase 5 — Elevate NL Refs to Structural Sources

**Scope:** CLI only. Non-breaking (lint severity change).

Change `hidden-source-in-nl` from warning to error. Add auto-fix that inserts undeclared refs into multi-source arrows or source blocks. Update graph and lineage to emit `@ref` edges (now safe because lint guarantees declaration).

**Key files:**
- `tooling/satsuma-cli/src/lint-engine.ts` — severity change + auto-fix
- `tooling/satsuma-cli/src/graph-builder.ts` — NL ref edge promotion
- `tooling/satsuma-cli/src/commands/lineage.ts` — NL ref traversal
- `tooling/satsuma-cli/src/nl-ref-extract.ts` — switch to `@ref` extraction, add `isStructuralSource` flag

**Depends on:** Phase 2 (multi-source arrows must exist for auto-fix target).
**Parallelizable with:** Phases 3 and 4.

---

## Sequencing

```
Phase 1 (Canonical Refs) ──────────────────────────────┐
                                                        ├──▶ Phase 3 (Grammar Simplification)
Phase 2 (Multi-Source Arrow) ──┬───────────────────────┘            │
                               │                                    ▼
                               └──▶ Phase 5 (Elevate NL Refs)    Phase 4 (Unify Quotes)
```

- **Phases 1 + 2**: parallel (different files)
- **Phase 3**: after 1+2 merge (builds on normalized refs)
- **Phase 4**: after 3 (sequential grammar changes)
- **Phase 5**: after 2 merges (needs multi-source arrows); parallelizable with 3+4

**Total: 5-6 PRs.**

---

## Success Criteria

### Correctness
1. All 16 CLI commands emit canonical `[ns]::schema.field` references in both JSON and text output.
2. Multi-source arrows parse correctly: `a, b, c -> target { ... }` with bare and schema-qualified sources.
3. Metadata with any combination of tags, values, enums, slices, and notes parses correctly under the simplified grammar.
4. Bare text pipe steps (no quotes) parse correctly: `field -> target { Convert to uppercase | trim }`.
5. The formatter auto-converts `'label'` to `` `label` `` and produces idempotent output.
6. `hidden-source-in-nl` is an error. `satsuma lint --fix` auto-adds undeclared `@ref` mentions to source declarations.
7. `satsuma graph --json` includes `@ref` edges in `schema_edges`.
8. All example `.stm` files parse cleanly under the new grammar.
9. Escaping behaves identically in backticks and double quotes.
10. Duplicate metadata tags are preserved without error.

### Testing
11. Tree-sitter corpus tests updated and passing (482+ tests).
12. CLI tests updated and passing (637+ tests).
13. New corpus tests for: multi-source arrows, bare pipe text, simplified metadata, backtick labels.
14. Round-trip test: `parse(format(source)) ≅ parse(source)` for all corpus fixtures.
15. Integration tests: `satsuma fmt --check examples/` exits 0 after migration.

### Documentation
16. `SATSUMA-V2-SPEC.md` updated: quoting rules, `@ref` syntax, multi-source arrows, simplified metadata, implicit NL in pipes.
17. `SATSUMA-CLI.md` updated: canonical ref format, `@ref` output, multi-source arrow output, lint error change.
18. `AI-AGENT-REFERENCE.md` updated: `@ref` convention, new syntax forms, canonical ref convention.
19. `DISCOVERED-REQUIREMENTS.md` updated: mark resolved requirements.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Grammar ambiguity in simplified rules | Medium — tree-sitter may struggle with greedy token repeats | Use `prec()` and `conflicts` to resolve; extensive corpus testing; keep delimiter exclusion clean |
| Breaking change for `.stm` files (single→backtick quotes) | Medium — all existing files need migration | Ship `satsuma fmt` migration before or with the change; run on all examples |
| Multi-source arrow ambiguity with comma in metadata | Low — comma in arrow source list vs metadata | Grammar precedence: comma-separated paths only before `->`, metadata only inside `()` |
| NL `@ref` elevation changes graph semantics | Medium — downstream consumers may not expect new edges | Document the change; add `--no-nl-edges` flag if needed for backward compat |
| Test update volume (~1100 tests touch output formats) | High — time cost | Phase 1 (canonical refs) is the biggest test update; subsequent phases are incremental |

---

## File Locations

| Artifact | Path |
|----------|------|
| Feature PRD | `features/22-language-simplification/PRD.md` |
| Tree-sitter grammar | `tooling/tree-sitter-satsuma/grammar.js` |
| Simplified corpus tests | `tooling/tree-sitter-satsuma/test/corpus/simplified_metadata.txt` (new) |
| Corpus tests | `tooling/tree-sitter-satsuma/test/corpus/` |
| CLI extraction | `tooling/satsuma-cli/src/extract.ts` |
| Metadata extraction | `tooling/satsuma-cli/src/meta-extract.ts` |
| NL ref extraction | `tooling/satsuma-cli/src/nl-ref-extract.ts` |
| Lint engine | `tooling/satsuma-cli/src/lint-engine.ts` |
| Graph builder | `tooling/satsuma-cli/src/graph-builder.ts` |
| Index builder | `tooling/satsuma-cli/src/index-builder.ts` |
| Formatter | `tooling/satsuma-cli/src/format.ts` |
| CLI commands | `tooling/satsuma-cli/src/commands/*.ts` |
| VS Code TextMate grammar | `tooling/vscode-satsuma/syntaxes/satsuma.tmLanguage.json` |
| VS Code LSP server | `tooling/vscode-satsuma/server/src/` |
| Language spec | `SATSUMA-V2-SPEC.md` |
| CLI docs | `SATSUMA-CLI.md` |
| Agent reference | `AI-AGENT-REFERENCE.md` |
| Example corpus | `examples/*.stm` |
| Discovered requirements | `DISCOVERED-REQUIREMENTS.md` |
