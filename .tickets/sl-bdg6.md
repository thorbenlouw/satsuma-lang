---
id: sl-bdg6
status: open
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

- FieldCoverageEntry, SchemaCoverageResult, MappingCoverageResult defined in satsuma-core and exported
- addPathAndPrefixes() and collectArrowPaths() in satsuma-core, tested in satsuma-core/test/coverage.test.js
- vscode coverage.ts imports types from @satsuma/core (no local duplicates)
- CLI getMappedFieldNames() uses same path normalisation as vscode ([] stripped + prefix expansion)
- CLI and vscode return identical mapped/unmapped answers for the same mapping on the examples/ corpus
- All existing CLI and vscode coverage/fields tests still pass
- Coverage parity verified: run satsuma fields --unmapped-by <mapping> and compare to vscode gutter for at least one example

