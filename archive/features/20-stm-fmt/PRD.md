# Feature 20 — `satsuma fmt`: Opinionated Formatter

> **Status: COMPLETE**

## Goal

Ship a zero-config, opinionated Satsuma formatter — analogous to `black` for Python or `gofmt` for Go. One canonical style, no user overrides, no configuration. The formatter is available as a CLI command (`satsuma fmt`) and as the VS Code "Format Document" provider for `.stm` files.

---

## Problem

Satsuma files are written by humans and AI agents, each with different spacing habits. The example corpus is manually kept consistent, but there is no automated way to enforce or apply the canonical style. This leads to:

1. **Inconsistent formatting** across files in a workspace, especially when multiple contributors (human or agent) edit concurrently.
2. **Noisy diffs** where whitespace and alignment changes obscure semantic changes.
3. **Wasted effort** aligning columns and fixing indentation by hand.
4. **No format-on-save** in VS Code — the LSP server (Feature 16) explicitly deferred formatting as a non-goal.

A canonical formatter eliminates formatting as a decision. Contributors run `satsuma fmt` (or hit Format in VS Code) and move on.

---

## Design Principles

1. **Zero configuration.** No `.satsumarc`, no flags to tweak style, no overrides. One style for all Satsuma files everywhere. This is non-negotiable — simplicity is the feature.
2. **Parser-backed.** The formatter walks the tree-sitter CST. It does not use regex or line-oriented heuristics.
3. **Comment-preserving.** All three comment types (`//`, `//!`, `//?`) are retained in their correct positions. Comments are never dropped or repositioned across blocks.
4. **Idempotent.** Running the formatter twice produces the same output as running it once. `fmt(fmt(x)) == fmt(x)`.
5. **Semantics-preserving.** The CST of formatted output is structurally identical to the CST of the input (ignoring whitespace tokens). Formatting never changes meaning.

---

## Non-Goals

- Configuration, style options, or per-project overrides.
- Sorting or reordering declarations (schemas, fields, imports, arrows). The formatter preserves declaration order.
- Inserting or removing language constructs (e.g. adding missing metadata, removing unused imports).
- Linting or diagnostics — that's `satsuma lint` (Feature 17).
- Formatting embedded NL content inside `"..."` or `"""..."""` strings. Natural language string content is preserved verbatim.

---

## Style Specification

The canonical style is derived from the conventions established in the example corpus (`examples/*.stm`). These rules are **fixed and not user-configurable**.

### Indentation

- **Unit:** 2 spaces. No tabs.
- **Nesting:** Each block level (`{ }`) adds one indentation level.

### Blank Lines

- **Between top-level blocks:** 2 blank lines (between schemas, mappings, fragments, transforms, metrics, notes, and import groups).
- **Between import statements:** 0 blank lines (consecutive imports are grouped tightly).
- **Before the first import:** 0 blank lines after the file-level header comment(s), 1 blank line if no header comment.
- **Within a block body:** 1 blank line to separate logical groups (e.g. between `source`/`target` sub-blocks and arrows, between groups of arrows separated by section comments). Existing blank-line groupings within a block body are preserved but normalised to exactly 1 blank line (consecutive blank lines collapse to 1).
- **No trailing blank lines** at end of file. Files end with a single newline.

### Field Alignment (in schemas, fragments, records)

Fields within the same block body are **column-aligned** in up to three columns:

```
  name          TYPE           (metadata)
```

1. **Name column** — left-aligned, starts at the block's indentation level.
2. **Type column** — left-aligned, starts at `(longest field name in block) + 2` spaces minimum gap, **capped at 24 characters** of name width. If the longest name exceeds 24 characters, longer names use a 2-space minimum gap instead of padding to the column.
3. **Metadata column** — left-aligned, starts at `type column + (longest type in block) + 2` spaces minimum gap, **capped at 14 characters** of type width. If the longest type exceeds 14 characters, longer types use a 2-space minimum gap instead of padding to the column.

The caps (24 for names, 14 for types) cover 100% of the existing example corpus. They prevent pathologically long names or types from pushing the entire block's alignment to absurd widths.

If a field has a trailing inline comment, it appears after the metadata (or after the type if no metadata) with a 2-space minimum gap.

Fragment spread lines (`...name`) are not aligned — they sit at the block indentation level and stand alone.

### Arrows (in mappings)

Arrow declarations are **not column-aligned** — each arrow stands on its own line with standard spacing:

```
  source.field -> target_field
  source.field -> target_field { transform | chain }
```

- Single space around `->`.
- Single space before `{` and after `}` in inline transform bodies.
- Pipe operators `|` have a single space on each side.

### Computed Arrows

```
  -> target_field {
    "NL description."
    | func1 | func2
  }
```

- Opening `{` on same line as the arrow.
- Body indented one level.
- Pipe continuation lines indented to the same level as the NL string above.
- Closing `}` on its own line at the arrow's indentation level.

### Block Structure

- **Opening brace** on the same line as the keyword: `schema name (...) {`
- **Closing brace** on its own line at the keyword's indentation level.
- **Single-line blocks** are allowed when the body is short enough (fits within 80 characters on the line): `target { \`name\` }`
- **Metadata parentheses** on the same line as the keyword when short. When multi-line, the opening `(` stays on the keyword line, continuation lines are indented one level, and the closing `)` can be on the same line as the last metadata entry or on the `{` line:

```
schema name (
  format postgresql,
  note "description"
) {
  ...
}
```

### Comments

- A single space after `//`, `//!`, and `//?`.
- Section-header comments (`// --- Section Name ---`) are preserved as-is.
- Inline trailing comments maintain a 2-space minimum gap from code.
- Block-preceding comments stay attached to the block they precede.
- Blank lines between a comment and its block are removed (comment is pulled tight to the block).

### Spacing

- No trailing whitespace on any line.
- Single space around `->`.
- Single space around `|` in pipe chains.
- Single space after `,` in metadata lists.
- No space inside `( )` for metadata: `(pk, required)` not `( pk, required )`.
- No space inside `{ }` for single-line bodies: `{ trim | lowercase }` not `{  trim | lowercase  }`.
- Single space between name and `(` for block metadata: `schema name (...)`.

### String Content

- Content inside `"..."` and `"""..."""` is **never modified**. The formatter does not touch natural language string interiors.
- Triple-quoted string delimiters (`"""`) are placed on their own lines when the string is multi-line.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Shared Core                        │
│                                                     │
│  format(tree: Tree, source: string): string         │
│                                                     │
│  Pure function. CST in, formatted string out.       │
│  No I/O, no config, no side effects.                │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────────────┐
│  CLI Command     │   │  VS Code LSP Server          │
│  satsuma fmt     │   │  DocumentFormattingProvider   │
│                  │   │                               │
│  - file/dir I/O  │   │  - receives document text     │
│  - --check mode  │   │  - calls format()             │
│  - exit codes    │   │  - returns TextEdit[]          │
│  - glob support  │   │  - format-on-save via editor  │
└──────────────────┘   └──────────────────────────────┘
```

### Core Formatter Module

A single pure function: takes a tree-sitter `Tree` and the original source string, returns the formatted string. No I/O, no configuration, no side effects.

**Location:** `tooling/satsuma-cli/src/format.ts` (or `format/` directory if it grows).

The formatter walks the full CST (`node.children`, not just `namedChildren`) to preserve comments and punctuation. It reconstructs output by emitting each node with canonical spacing, indentation, and alignment.

**Key implementation detail:** Field alignment requires a two-pass approach within each block — first pass measures column widths, second pass emits aligned output.

### CLI Command

```
satsuma fmt [path]            # format file or directory (in place)
satsuma fmt [path] --check    # exit 1 if any file would change (for CI)
satsuma fmt [path] --diff     # print diff instead of writing
```

- **`[path]`** — a `.stm` file or directory. When given a directory, recursively formats all `.stm` files.
- **`--check`** — dry-run mode. Exits 0 if all files are already formatted, 1 if any would change. Prints the list of unformatted files.
- **`--diff`** — prints a unified diff of what would change, without writing.
- **No path** — formats all `.stm` files in the current directory (recursive).
- **Stdin/stdout** — when `--stdin` is passed, reads from stdin and writes formatted output to stdout (useful for editor integrations and pipes).
- **Exit codes:** 0 = success (or already formatted), 1 = files would change (with `--check`), 2 = parse errors.

Files with parse errors are **skipped** with a warning (the formatter only operates on valid CSTs). This matches `black`'s behaviour.

### VS Code Integration

The LSP server registers a `DocumentFormattingProvider`. When the user triggers Format Document (or format-on-save is enabled), the server:

1. Parses the document with tree-sitter (already cached from live editing).
2. Calls the shared `format()` function.
3. Returns a single `TextEdit` replacing the full document range.

No additional VS Code extension configuration is needed — `documentFormattingProvider` is a standard LSP capability that VS Code surfaces automatically.

---

## Success Criteria

### Correctness
1. `satsuma fmt file.stm` produces correctly formatted output for all files in `examples/`.
2. Formatting is **idempotent**: `satsuma fmt` on an already-formatted file produces no changes.
3. Formatting is **semantics-preserving**: the tree-sitter parse tree of formatted output matches the original (structurally, ignoring whitespace).
4. `satsuma fmt --check examples/` exits 0 (the example corpus is the canonical style).
5. All three comment types are preserved in correct positions.
6. Parse-error files are skipped with a diagnostic message, not crashed on.
7. VS Code "Format Document" on a `.stm` file uses the same formatter and produces identical output to the CLI.
8. Round-trip test: for every corpus test fixture, `parse(format(source)) ≅ parse(source)`.
9. Performance: formatting a 500-line file completes in under 100ms.
10. No configuration files, flags, or settings alter the formatting style.

### Testing
11. Unit tests cover every block type (schema, fragment, mapping, transform, metric, note, import) and their formatting rules.
12. Unit tests cover edge cases: deeply nested records, long metadata lines, inline comments at alignment boundaries, empty blocks, single-line vs multi-line decisions.
13. Integration tests run `satsuma fmt --check` against the full example corpus.
14. Round-trip structural equivalence tests for all corpus fixtures.
15. Exploratory testing: manually run the formatter against real-world `.stm` files (including large, messy, or agent-generated files) and verify the output looks correct and readable. Document any surprising results.

### Documentation
16. `SATSUMA-CLI.md` updated with the `fmt` command, its flags, and usage examples.
17. `AI-AGENT-REFERENCE.md` updated with formatter guidance (how agents should use `satsuma fmt`, when to run it, CI expectations).
18. Landing page / site updated to mention the formatter as a tooling feature.
19. `PROJECT-OVERVIEW.md` updated if the formatter changes the tooling architecture description.

---

## Implementation Phases

### Phase 1 — Core Formatter + CLI Command

- Implement `format()` as a pure function over the CST.
- Handle all block types: schema, fragment, mapping, transform, metric, note, import.
- Implement field column alignment within schema/fragment/record bodies.
- Implement arrow formatting in mapping bodies.
- Handle all comment types and positions.
- Handle single-line vs multi-line block decisions.
- Add `fmt` command to CLI with `--check`, `--diff`, and `--stdin` flags.
- Add tests using the example corpus as golden fixtures.
- Add targeted tests for edge cases (deeply nested records, long metadata, inline comments at alignment boundaries).

### Phase 2 — VS Code Integration

- Register `DocumentFormattingProvider` in the LSP server.
- Wire the shared `format()` function into the LSP formatting handler.
- Verify format-on-save works with standard VS Code settings.
- Add `DocumentRangeFormattingProvider` if feasible (format selection).

### Phase 3 — CI Integration

- Add `satsuma fmt --check` to the project's CI pipeline.
- Format the entire example corpus and commit (should be a no-op if the style matches).
- Document the formatter in `SATSUMA-CLI.md`.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Column alignment heuristics produce ugly output for extreme cases (very long names/types) | Low — rare in practice | Cap alignment at a maximum column; fall back to minimum-gap spacing beyond that |
| Comment repositioning loses association with the code it describes | High — data loss | Conservative approach: comments stay attached to the next sibling node; never move comments across blank lines |
| Multi-line metadata formatting edge cases (deeply nested `record` with metadata) | Medium | Test with all corpus fixtures; add targeted edge-case fixtures |
| Shared core between CLI (Node) and VS Code (WASM) needs adaptation | Low | The formatter operates on the CST API, which is identical between bindings; only the tree construction differs |
| Disagreement on style choices after shipping | Low | The `black` philosophy: ship an opinionated style and don't revisit it. Style is derived from the existing corpus, not invented |

---

## File Locations

| Artifact | Path |
|----------|------|
| Feature PRD | `features/20-stm-fmt/PRD.md` |
| Core formatter | `tooling/satsuma-cli/src/format.ts` |
| CLI command | `tooling/satsuma-cli/src/commands/fmt.ts` |
| Formatter tests | `tooling/satsuma-cli/src/__tests__/format.test.ts` |
| LSP handler | `tooling/vscode-satsuma/server/src/formatting.ts` |
| CLI docs update | `SATSUMA-CLI.md` |
