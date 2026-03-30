# ADR-010 — Core as the Single Extraction Truth, Consumers as Thin Wiring

**Status:** Accepted
**Date:** 2026-03-30
**Supersedes:** ADR-003 (partially — extends and strengthens its intent)

## Context

ADR-003 established that all pure CST extraction logic should live in `satsuma-core`. The CLI completed this migration: it delegates extraction, validation, classification, metadata parsing, spread expansion, and NL ref resolution to core, retaining only thin adapter shims (tracked in sl-n4wb) and CLI-specific concerns (workspace discovery, output formatting, lint rules).

The LSP server (`vscode-satsuma/server`) never completed this migration. An audit in March 2026 found that:

- **`workspace-index.ts`** (~650 LOC) reimplements schema, mapping, fragment, metric, transform, and import extraction by walking the CST directly. It does not call any of core's `extract*` functions. It has its own field tree builder (`extractFields()`), its own text helpers (`sourceRefText()`, `qualifiedNameText()`, `fieldNameText()`), and its own traversal helper (`walkDescendants()`).

- **`viz-model.ts`** (~1,200 LOC) reimplements schema, mapping, metric, and field extraction; metadata extraction; transform classification; fragment spread resolution; and reference resolution. It uses core only for `extractAtRefs`, `classifyRef`, and `resolveRef`.

- **`hover.ts`**, **`definition.ts`**, **`completion.ts`**, and **`semantic-diagnostics.ts`** use zero core extraction functions.

This means:

1. **Behaviour diverges.** Core's `stringText()` does not handle escape sequences; the CLI's `stripDelimiters()` does. Core's `classifyTransform()` returns `"structural"`; viz uses `"pipeline"`. Core's `extractMetadata()` returns a rich discriminated union; viz flattens to key-value pairs. Core's spread expansion detects cycles and reports diagnostics; viz silently skips cycles. These are not intentional design differences — they are drift from independent implementations.

2. **Grammar changes require parallel fixes.** A tree-sitter grammar change that renames a node type must be updated in core *and* in the LSP's local extraction logic — the exact duplication ADR-003 was designed to prevent.

3. **Test coverage is duplicated and incomplete.** Core, CLI, and LSP each test extraction independently with overlapping fixtures but different expectations. The LSP tests cover their local extraction but don't validate consistency with core's output.

ADR-005 established the callback pattern for spread expansion. ADR-006 established the callback pattern for NL ref resolution. These patterns work well — they decouple core from consumer-specific index types while keeping the extraction logic in one place. The same pattern should be applied to every shared concern.

## Decision

### Principle: Core owns all unit-testable extraction logic. Consumers only wire and adapt.

`satsuma-core` is the single source of truth for:

1. **CST extraction** — all `extract*` functions for schemas, mappings, fragments, metrics, transforms, imports, namespaces, notes, arrows, fields, and metadata.
2. **CST navigation** — all text extraction helpers (`labelText`, `stringText`, `entryText`) including escape handling.
3. **Classification** — `classifyTransform()` and `classifyArrow()`.
4. **Spread expansion** — `expandEntityFields()`, `expandSpreads()`, `expandNestedSpreads()` via callbacks.
5. **NL ref extraction and resolution** — `extractAtRefs()`, `classifyRef()`, `resolveRef()`, `resolveAllNLRefs()` via callbacks.
6. **Semantic validation** — `collectSemanticDiagnostics()` via the `SemanticIndex` interface.
7. **Canonical references** — `canonicalRef()`, `canonicalEntityName()`, `resolveScopedEntityRef()`.
8. **String utilities** — `normalizeName()`, `capitalize()`.

Consumers (`satsuma-cli`, `vscode-satsuma`, future tools) are responsible only for:

- **Parser initialization** — WASM loading and file I/O.
- **Workspace orchestration** — file discovery, import following, multi-file index building.
- **Callback wiring** — creating the `EntityRefResolver`, `SpreadEntityLookup`, `DefinitionLookup` callbacks from their own index types.
- **Output adaptation** — mapping core types to CLI output formats, LSP diagnostic types, VizModel structures, etc.
- **Consumer-specific features** — lint rules, code actions, completions, hover, CodeLens, etc.

### Corollary: where implementations diverge, reconcile in core first

When migrating a consumer's local implementation to core, the ticket must explicitly compare both implementations and determine:

- Which handles more edge cases correctly (escapes, cycles, nesting)?
- Which produces the better diagnostic messages?
- Which has the richer type information?

The answer becomes core's implementation. The consumer adapts to it. If the consumer needs a different *shape* (e.g., flat key-value vs. discriminated union), the adaptation layer lives in the consumer — but the *extraction* always comes from core.

### Corollary: test extraction once, in core

Extraction logic is tested comprehensively in `satsuma-core`'s test suite. Consumer test suites validate only:

- Their adapter/wiring layer (callback construction, type mapping).
- Their consumer-specific features (output formatting, LSP protocol behaviour, UI rendering).
- Integration scenarios that exercise the full stack (file → parse → extract → index → feature).

Consumer tests must not duplicate core extraction tests. When migrating extraction logic from a consumer to core, the corresponding consumer tests either move to core's suite or are deleted if core already covers them.

## Consequences

**Positive:**

- Grammar changes require a single fix in core. Both CLI and LSP get the fix automatically.
- Escape handling, classification, metadata shapes, and spread semantics are consistent across all tools.
- Core's test suite becomes the authoritative validation of extraction correctness, reducing total test count while increasing coverage confidence.
- New consumers (e.g., a future web-based editor, a CI validation tool) get full extraction for free.

**Negative:**

- The LSP migration is substantial (~1,800 LOC of local extraction to replace with core calls + adapters).
- Core's API surface may need to grow to accommodate LSP needs (e.g., optional source location on `FieldDecl`, richer classification mapping).
- Some LSP-specific extraction (e.g., viz-model's `injectImportedSchemaStubs()`) will remain in the LSP — the boundary must be judged case by case.
- The migration must be sequenced carefully to avoid breaking LSP features mid-refactor.
