# stm CLI — LLM Context Slicer

Command-line tool that uses the tree-sitter STM v2 parser to index STM workspaces and provide structured output for LLM context, linting, and navigation.

---

## Requirements

- Node.js 20+
- `tree-sitter-stm` built (see `tooling/tree-sitter-stm/`)

## Installation (local dev)

```bash
cd tooling/stm-cli
npm install
npm link          # makes `stm` available on PATH
```

## Usage

```
stm <command> [options] [path]
```

`path` defaults to the current directory (looks for `*.stm` files and a workspace file).

---

## Commands

| Command | Description |
|---------|-------------|
| `stm summary [path]` | Print a summary of all schemas, metrics, and mappings |
| `stm schema <name> [path]` | Show full field list for a schema |
| `stm metric <name> [path]` | Show metric definition and source schemas |
| `stm mapping <name> [path]` | Show arrows, source, and target for a mapping |
| `stm find <token> [path]` | Find all uses of a metadata token (e.g. `pii`) |
| `stm lineage <schema> [path]` | Show upstream/downstream lineage for a schema |
| `stm where-used <name> [path]` | Find where a schema or fragment is referenced |
| `stm warnings [path]` | List all `//!` warning comments |
| `stm context <name> [path]` | Emit LLM-ready context slice for a schema or mapping |

---

## Architecture

```
src/
  index.js          Entry point; registers commands on the commander program
  commands/         One module per stm sub-command (Phase 1+)
  loader.js         Workspace loader: discovers .stm files, builds CST index (Phase 1)
  query.js          Reusable tree-sitter query helpers (Phase 1)
```

The CLI depends on `tree-sitter-stm` (Feature 08) for all parsing. It never reads raw STM text except through the CST.

---

## Development

```bash
# Run directly without linking
node src/index.js summary examples/

# Run tests (Phase 12+)
npm test
```
