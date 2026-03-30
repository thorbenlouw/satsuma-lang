---
id: sl-bdg6
status: closed
deps: []
links: []
created: 2026-03-30T05:30:05Z
type: feature
priority: 2
assignee: Thorben Louw
---
# consolidate mapping coverage logic into satsuma-core

The CLI (satsuma-cli/src/commands/fields.ts getMappedFieldNames) and VS Code extension (vscode-satsuma/server/src/coverage.ts computeMappingCoverage) both independently compute which fields are covered by a mapping's arrows, using completely different approaches with inconsistent results:

CLI approach:
- Source: pre-built index.fieldArrows Map
- Output: Set<string> (no positions)
- Path normalisation: strips [] only
- Does NOT handle each_block / flatten_block scoping correctly

VS Code approach:
- Source: walks the AST directly for the current file
- Output: MappingCoverageResult with uri, line, mapped boolean per field
- Path normalisation: splits/reconstructs with all prefixes
- Handles each_block and flatten_block scope nesting explicitly
- Types (FieldCoverageEntry, SchemaCoverageResult, MappingCoverageResult) defined locally in coverage.ts

No shared types or logic exist in satsuma-core. The inconsistency means the CLI --unmapped-by flag and the VS Code gutter decorations can give different answers for the same mapping.

An unmapped subcommand in the CLI (showing source/target fields not covered by arrows) would also need this logic.

## Design

Phase 1 — move types to satsuma-core:
  Move FieldCoverageEntry, SchemaCoverageResult, MappingCoverageResult to satsuma-core/src/coverage.ts (new file). Export from satsuma-core/src/index.ts. Update vscode coverage.ts to import from @satsuma/core.

Phase 2 — extract shared path utilities to satsuma-core:
  Create addPathAndPrefixes(set, path) (strips [] brackets, splits on dot, adds each prefix and bare leaf — matching vscode's more complete logic). Create collectArrowPaths(arrows, role) → Set<string> using the above. These replace both CLI's normalizePath+Set<string> and vscode's inline addPath(). Both are tested in satsuma-core.

Phase 3 — create core computeCoverage function:
  computeCoverage(fields: FieldDecl[], coveredPaths: Set<string>, role: 'source'|'target', uri: string) → SchemaCoverageResult. Encapsulates field-to-coverage matching. CLI and vscode both call this with their respective path sets.

Phase 4 — wire up CLI unmapped subcommand (separate ticket is fine):
  satsuma unmapped <mapping> <dir> — prints fields not covered by arrows, using satsuma-core coverage primitives.

## Acceptance Criteria

**Correctness**
- FieldCoverageEntry, SchemaCoverageResult, MappingCoverageResult defined in satsuma-core and exported
- addPathAndPrefixes() and collectArrowPaths() in satsuma-core
- vscode coverage.ts imports types from @satsuma/core (no local duplicates)
- CLI getMappedFieldNames() uses same path normalisation as vscode ([] stripped + prefix expansion)
- CLI and vscode return identical mapped/unmapped answers for the same mapping on the examples/ corpus
- All existing CLI and vscode coverage/fields tests still pass
- Coverage parity verified: run satsuma fields --unmapped-by <mapping> and compare to vscode gutter for at least one example

**Code quality**
- coverage.ts is literate: a module-level comment explains the coverage model (what "covered" means for source vs target paths, how each_block and flatten_block scoping works); each exported function has a doc-comment that describes its contract, not just its signature
- Types are self-documenting: every field on FieldCoverageEntry, SchemaCoverageResult, MappingCoverageResult has a brief inline comment explaining what it represents and how consumers use it

**Tests**
- satsuma-core/test/coverage.test.js is the canonical suite; any coverage tests previously spread across CLI and vscode packages that tested the same path logic are consolidated here and removed from the consumer packages
- Each test case has a leading comment explaining *which coverage rule* it validates and *why that rule matters* (e.g. "addPathAndPrefixes must register all ancestor prefixes — coverage checks fire on partial paths like 'address' even when the arrow targets 'address.city'")
- Cases cover the boundary conditions: flat arrow, dotted path, array-notation path, each_block scoping, flatten_block scoping, overlapping source and target fields
- No two tests validate the same invariant at the same level of abstraction

