# ADR-022 — Selective Transitive Import Reachability and File-Based Workspace Scope

**Status:** Accepted
**Date:** 2026-03

## Context

The Satsuma v2 spec (section 5.3) had one correct rule and one rule that was too strict:

1. Imports are explicit. Only the symbols named in an `import { ... }` clause are brought into scope.
2. Symbols that exist in the same workspace directory but are not reachable through transitively resolving the imports from the file in consideration are not in scope.
3. The spec's current "imports are not re-exported" wording is too blunt for the intended model. Imported symbols must carry their own dependency graph with them, but that does not make unrelated definitions from the imported file visible.

The exploratory bugs exposed a different problem: some tooling paths still treat the filesystem or workspace folder as the effective scope. Directory-level CLI commands can create accidental merged workspaces, and IDE/LSP features must not fall back to "everything in the folder" when resolving symbols.

The required change is therefore:
- MODIFY the spec's import visibility rules so an explicitly imported symbol brings only its exact transitive dependencies into scope.
- make workspace scope file-based everywhere: CLI, IDE, and LSP operations all use the file in scope and its import graph
- remove directory mode from CLI commands so a workspace is defined by a chosen file and its import graph

## Decision

### 1. Make imported symbols carry their exact dependency graph


- An `import` only introduces the names it explicitly lists.
- Those imported names may rely on their own transitive dependencies.
- Unrelated definitions from the same imported file are not automatically in scope.
- A downstream file can use symbols that are transitively reachable through the imported symbols' dependency graph.

This preserves precise, teachable semantics: scope is defined by explicit imports, not by file co-location.

### 2. Workspace scope is file-based everywhere

All tooling uses the file in scope and its import graph as the workspace boundary.

- CLI commands operate on file arguments only.
- IDE/LSP features for an open file consider only what is reachable transitively via imports from that file.
- Tooling must not treat the surrounding directory or workspace folder as an implicit merged scope.

### 3. CLI commands operate on file arguments only

For commands that accept a path, the path must be a `.stm` file. Directory arguments are not supported.

```bash
# Validate one workspace entry file
satsuma validate examples/sfdc-to-snowflake/pipeline.stm

# Graph one platform entry file
satsuma graph platform.stm --json

# Error: directory arguments are not accepted
satsuma validate examples/sfdc-to-snowflake/
```

When given a file, the CLI resolves exactly the explicitly imported symbols required by that file, along with their transitive dependencies, and builds the workspace from the resulting import graph. The workspace boundary is defined by the entry file, not by the filesystem.

### 4. Entry files are the canonical workspace boundary

Platform entry files such as `platform.stm` remain the canonical way to describe a whole platform intentionally. Example workspaces may also have their own entry files.

### 5. File-based workspace selection does not change symbol visibility rules

File-based workspace selection does not relax import semantics:

- importing one symbol from a file does not make every definition in that file visible
- transitively required dependencies of imported symbols do remain reachable
- references still have to resolve through explicit imports
- IDE/LSP navigation, completion, rename, and diagnostics use the same boundary

## Consequences

**Positive:**
- Preserves explicit imports while allowing imported symbols to bring the dependencies they actually need.
- Eliminates accidental directory-wide or workspace-folder-wide scope merging.
- Makes tooling scope deterministic and reproducible: the same entry file always produces the same workspace.
- Avoids conflating filesystem discovery with symbol scope.

**Negative:**
- Removing directory mode is a breaking change for CLI users and docs.
- Example workspaces need a clear entry file wherever whole-workspace commands are expected.
- Documentation must explain that file selection defines workspace scope across CLI and IDE/LSP, while imports define symbol reachability.
