---
id: sl-2e4z
status: open
deps: []
links: []
created: 2026-03-23T09:55:40Z
type: task
priority: 3
assignee: Thorben Louw
tags: [feature-16, lsp, vscode]
---
# LSP Phase 1: core server (semantic tokens, fold ranges, document symbols, diagnostics)

## Acceptance Criteria

Node.js LSP server using vscode-languageserver + tree-sitter. File-level features: semantic tokens, fold ranges, document symbols, live diagnostics from satsuma validate. Extension activates and connects.


## Notes

**2026-03-23T13:00:00Z**

Progress: Second PR (feat/lsp-phase1). Added 2 more Phase 1 features:
- ✅ Semantic tokens — highlights.scm captures mapped to LSP SemanticTokenTypes (keyword, type, function, property, decorator, namespace, etc.) with definition modifiers; multi-line token support; deduplication of overlapping captures
- ✅ Hover — contextual markdown hover for all block types (schema/fragment/mapping/transform/metric/namespace/note), field declarations (type, metadata, parent), tag descriptions, fragment spread resolution (same-file), arrow paths, pipe chain functions
- ✅ 30 new tests (12 semantic tokens + 18 hover), 56 total LSP tests passing

Remaining for sl-2e4z:
1. Semantic diagnostics — shell out to `satsuma validate --json` on save
2. Go-to-definition — deferred to sl-t7mg
3. Find references — deferred to sl-t7mg

**2026-03-23T11:19:17Z**

**2026-03-23T11:15:00Z**

Progress: First PR merged (feat/lsp-phase1, PR #47). Delivered LSP server scaffold with 3 of 7 Phase 1 features:
- ✅ Document symbols (outline panel with all block types, nested fields)
- ✅ Parse-error diagnostics (ERROR/MISSING nodes, //! warnings, //? info)
- ✅ Code folding (all block types matching folds.scm)
- ✅ PRD updated to align with latest SATSUMA-V2-SPEC.md
- ✅ README updated with build/install/test docs
- ✅ 26 unit tests passing

Remaining for sl-2e4z:
1. Semantic tokens — map highlights.scm to LSP semantic token types (per-file, no workspace index)
2. Hover — field type/metadata, schema summaries, fragment/transform info (per-file)
3. Semantic diagnostics — shell out to `satsuma validate --json` on save for workspace-level warnings (undefined schemas, duplicate names, missing imports)
4. Go-to-definition — uses locals.scm (may be deferred to sl-t7mg)
5. Find references — workspace-aware (may be deferred to sl-t7mg)

Recommended next PR: semantic tokens + hover (both per-file, natural extension of current architecture). Semantic diagnostics as a follow-up PR since it introduces CLI subprocess integration.

Architecture: server at tooling/vscode-satsuma/server/, client at tooling/vscode-satsuma/src/extension.ts, esbuild bundles both. Tests use Node built-in test runner importing from dist/.
