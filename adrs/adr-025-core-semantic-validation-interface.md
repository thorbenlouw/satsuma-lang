# ADR-025 — Core Semantic Validation Interface

**Status:** Accepted
**Date:** 2026-04-07 (sl-bxzg)

## Context

ADR-020 established that `satsuma-core` should own shared extraction and validation logic, with consumers limited to wiring and output adaptation. ADR-022 established selective transitive import reachability as the workspace scope rule. Before `sl-bxzg`, semantic validation followed those decisions only partially.

The core validator owned the semantic rules in `tooling/satsuma-core/src/validate.ts` through `collectSemanticDiagnostics(index, reachability?)`. The CLI adapter in `tooling/satsuma-cli/src/semantic-warnings.ts` still computed import reachability before calling core, so part of the validation pipeline lived outside the validator. The LSP adapter in `tooling/satsuma-lsp/src/semantic-diagnostics.ts` was split further: it ran a partial core semantic pass against an adapted workspace index, then ran a separate LSP-specific missing-import pass using its own reachability traversal and diagnostic construction.

That split made it easy for validation behavior to diverge. A future change to import-scope checking could be fixed in the CLI path while the LSP missing-import path stayed stale, or vice versa. It also made the architectural boundary harder to explain: core owned the individual rules, but consumers still owned part of the rule orchestration.

Two alternatives were considered. The first was to keep `collectSemanticDiagnostics(index, reachability?)` as the only core API and make each consumer compute reachability consistently. That would preserve the existing signature but keep orchestration duplicated. The second was to move the LSP missing-import diagnostic wording directly into core. That would remove more LSP code, but it would couple core to editor-specific presentation and quick-fix language. Neither was the right boundary.

## Decision

`satsuma-core` owns the shared semantic validation entry point. Consumers should call `validateSemanticWorkspace(index, options)` from `tooling/satsuma-core/src/validate.ts` when they need semantic diagnostics for a workspace. That function computes import reachability from resolved imports when provided, preserves the existing validation rule order, and returns core `SemanticDiagnostic` records.

Consumers still own their index adapters and diagnostic presentation. CLI validation passes its `ExtractedWorkspace` plus `fileImports` into `validateSemanticWorkspace()` and maps the resulting `SemanticDiagnostic[]` to `LintDiagnostic[]`. The LSP builds a core `SemanticIndex` from its editor-oriented `WorkspaceIndex`, passes resolved file imports into `validateSemanticWorkspace()`, and uses an `importScopeDiagnostic` policy to keep its public `missing-import` code and import-suggestion message without reimplementing reachability.

`collectSemanticDiagnostics(index, reachability?)` remains as a compatibility wrapper for existing core-level callers, but new consumer integrations should prefer `validateSemanticWorkspace()` so reachability integration stays in core.

## Consequences

**Positive:**
- CLI and LSP semantic diagnostics now share one reachability-aware validation pipeline.
- Core owns validation orchestration as well as individual semantic rules, matching ADR-020's "consumers as thin wiring" direction.
- LSP can preserve editor-specific diagnostic codes and messages without duplicating the import-scope rule engine.
- Future validation consumers have a single documented entry point instead of reconstructing reachability and rule ordering themselves.

**Negative:**
- Core's validation API surface is larger and now includes a presentation hook for import-scope diagnostics.
- LSP still needs an adapter from its editor-shaped `WorkspaceIndex` to core's `SemanticIndex` until the LSP index carries the same full semantic data as the CLI.
- Live LSP validation still lacks checks that require full arrow and NL extraction from the CLI workspace model; the on-save CLI subprocess remains the fallback for those cases.
