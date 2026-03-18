# stm CLI — Deterministic Structural Extraction

Command-line tool that uses the tree-sitter STM v2 parser to index STM workspaces and provide structured output for agent composition, validation, and navigation. **The CLI extracts structural facts and delivers NL content verbatim — it does not interpret natural language.**

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

`path` defaults to the current directory (looks for `*.stm` files).

---

## Commands

### Workspace Extractors — retrieve whole blocks

| Command | Description |
|---------|-------------|
| `stm summary [path]` | Overview of all schemas, metrics, and mappings |
| `stm schema <name> [path]` | Full field list for a schema |
| `stm metric <name> [path]` | Metric definition and source schemas |
| `stm mapping <name> [path]` | Arrows, source, and target for a mapping |
| `stm find <token> [path]` | Fields carrying a metadata token (e.g. `pii`) |
| `stm lineage [path]` | Schema-level graph traversal (`--from` / `--to`) |
| `stm where-used <name> [path]` | All references to a schema or fragment |
| `stm warnings [path]` | All `//!` warning and `//?` question comments |
| `stm context <query> [path]` | Keyword-ranked block extraction for LLM context |

### Structural Primitives — slice below block level

| Command | Description |
|---------|-------------|
| `stm arrows <schema.field> [path]` | All arrows involving a field with transform classification |
| `stm nl <scope> [path]` | NL content (notes, transforms, comments) within a scope |
| `stm meta <scope> [path]` | Metadata entries (tags, types, constraints) for a block or field |
| `stm fields <schema> [path]` | Field list with types; `--unmapped-by` for coverage gaps |
| `stm match-fields [path]` | Deterministic normalized name matching between two schemas |

### Structural Analysis

| Command | Description |
|---------|-------------|
| `stm validate [path]` | Parse errors + semantic reference checks |
| `stm diff <a> <b>` | Structural comparison of two STM files or directories |

---

## Transform Classification

Every arrow returned by the CLI carries a classification derived from CST node types:

| Marker | CST Condition | Meaning |
|--------|---------------|---------|
| `[structural]` | All steps are `token_call`, `map_literal`, or `fragment_spread` | Deterministic pipeline — fully specified |
| `[nl]` | All steps are `nl_string` or `multiline_string` | Natural language — agent must interpret |
| `[mixed]` | Both structural and NL steps present | Partially deterministic — review NL portion |
| `[none]` | No transform body (bare `src -> tgt`) | Direct mapping, no transformation |

This classification is a **mechanical CST check** — it tells agents exactly where structural certainty ends.

---

## What the CLI Does Not Do

The CLI does not include `impact`, `coverage`, `audit`, `scaffold`, or `inventory` commands. These are **workflows that agents compose from primitives**, applying their own reasoning to the NL content the CLI surfaces. The correctness of such workflows depends on NL interpretation, which is outside the CLI's scope.

---

## Architecture

```
src/
  index.js           Entry point; registers commands on the commander program
  commands/          One module per stm sub-command
  extract.js         CST extraction functions (schemas, mappings, arrows, etc.)
  classify.js        Transform classification (structural/nl/mixed/none)
  index-builder.js   Builds WorkspaceIndex from parsed files
  nl-extract.js      NL content extraction from CST subtrees
  meta-extract.js    Structured metadata extraction
  normalize.js       Deterministic name normalization for field matching
  validate.js        Structural and semantic validation
  diff.js            Structural comparison of two WorkspaceIndex instances
  parser.js          Tree-sitter parser wrapper
  workspace.js       STM file discovery
  errors.js          Shared error handling and exit codes
```

---

## Development

```bash
# Run directly without linking
node src/index.js summary ../../examples/

# Run tests
npm test
```
