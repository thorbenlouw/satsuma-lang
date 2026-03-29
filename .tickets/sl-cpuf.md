---
id: sl-cpuf
status: open
deps: []
links: []
created: 2026-03-29T15:53:26Z
type: feature
priority: 1
assignee: Thorben Louw
tags: [vscode, lsp, imports, scoping]
---
# feat(vscode): import-scoped resolution — only reachable symbols are in scope

Currently the LSP server and all VS Code extension features (viz, field-lineage, diagnostics, completions, go-to-definition, find-references, hover, rename, code lens) build their workspace index by scanning ALL .stm files in the workspace folder recursively. This is wrong.

Satsuma has explicit imports. A symbol (schema, fragment, mapping, metric) is only in scope in a file if it was explicitly imported (directly or transitively) into that file. The workspace should be bounded by the import graph rooted at the current file, not the entire folder tree.

## Design

## Current behaviour
- LSP server: on init, calls indexWorkspaceFolder() which does findStmFiles() — a recursive directory scan of every .stm in the workspace root. Every symbol from every file is indexed together and treated as globally visible.
- Viz panel (satsuma/vizModel): queries wsIndex which is the global index above.
- Field-lineage panel: passes vscode.workspace.workspaceFolders[0].uri.fsPath (the workspace root dir) to the CLI. resolveInput() on a directory calls findStmFiles() — again all files, not import-filtered.
- CLI commands generally: already have followImports() in workspace.ts for single-file input. This logic is correct but the VS Code layer bypasses it by always passing the workspace root directory.

## Correct behaviour
Reachability is defined by the import graph: starting from the entry file (the currently active .stm editor), follow all import { ... } from ".." declarations transitively. Only symbols reachable via this graph are in scope.

### LSP server
The global wsIndex should either:
(a) remain a flat global index for indexing/file-watching purposes, but all resolution calls (completions, go-to-def, references, hover, rename, diagnostics) must filter to the import-reachable set for the given document URI; OR
(b) build per-file scoped indexes on demand using followImports.

Option (a) is preferred: keep global index for fast lookup, add a getImportReachableUris(uri, wsIndex) helper that returns the set of file URIs transitively reachable from a given file, then guard all resolution against that set.

### Field-lineage panel
Pass the active .stm file path (the document the user triggered the command from), not the workspace folder root. The CLI's followImports() will then correctly scope the workspace.

### Viz panel
buildVizModel() receives the file URI. It should pass the file-scoped set of indexed symbols (only those reachable from that URI's import graph) rather than the full wsIndex.

### Diagnostics
A reference to a schema/fragment/mapping that exists in the workspace but is NOT reachable from the current file's import graph should be flagged as a semantic error: 'Schema X is not imported. Add: import { X } from "path/to/file.stm"'. This is a new diagnostic rule.

## Acceptance Criteria

- [ ] getImportReachableUris(uri, wsIndex) helper implemented and tested
- [ ] LSP completions only suggest symbols reachable from the current file's import graph
- [ ] go-to-definition resolves only reachable symbols
- [ ] find-references scoped to files reachable from the queried symbol's defining file
- [ ] hover, rename, code lens similarly scoped
- [ ] Diagnostics: reference to an in-workspace-but-not-imported symbol emits a new 'missing-import' error with the suggested import statement as a code action fix
- [ ] Field-lineage panel passes the active file path (not workspace root) to the CLI
- [ ] Viz panel (satsuma/vizModel) scopes its symbol resolution to the import-reachable set
- [ ] Existing LSP tests updated/extended to cover import-scoping
- [ ] New test: file that references a schema from a sibling file without importing it gets a missing-import diagnostic
- [ ] New test: field-lineage called from a file that imports metric_sources.stm correctly includes those schemas in the lineage graph

