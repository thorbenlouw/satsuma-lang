# tree-sitter-stm

Tree-sitter grammar package for STM.

## Scope

This package is responsible for syntax parsing only. It should produce a stable
concrete syntax tree (CST) for STM v1.0.0 and support downstream tooling such
as:

- `stm lint`
- `stm fmt`
- visualizers
- editor integrations
- AST/IR builders

This package does not implement semantic validation, import resolution, type
checking, or code generation.

## Source Of Truth

- Language spec: [`STM-SPEC.md`](/Users/thorben/dev/personal/stm/STM-SPEC.md)
- Canonical examples: [`examples/`](/Users/thorben/dev/personal/stm/examples)
- Parser planning: [`features/01-treesitter-parser/PRD.md`](/Users/thorben/dev/personal/stm/features/01-treesitter-parser/PRD.md)
- Parser task list: [`features/01-treesitter-parser/TODO.md`](/Users/thorben/dev/personal/stm/features/01-treesitter-parser/TODO.md)
- CST/AST mapping: [`docs/ast-mapping.md`](/Users/thorben/dev/personal/stm/docs/ast-mapping.md)

## Package Layout

- `grammar.js`: Tree-sitter grammar definition (28 documented conflicts)
- `queries/`: highlight and fold queries
- `test/corpus/`: feature-oriented grammar corpus (8 test files)
- `test/fixtures/`: example and recovery fixture definitions
- `scripts/`: test runners and the CST consumer proof
- `CONFLICTS.expected`: locked conflict count for CI enforcement

## Consumer Proof — CST Summary

`scripts/cst_summary.py` is the parser-consumer proof for this package. It runs
the repo-local Tree-sitter wrapper for each STM example file and emits JSON
summaries derived from CST node types, fields, and byte ranges rather than
reparsing STM syntax from raw text.

It currently proves extraction of:

- top-level blocks and schema descriptions
- schema fields and groups (including nested groups)
- mapping entries, computed entries, block entries, and nested maps
- path references across namespaced, relative, and field paths
- comment severities (info, warning, question)
- note blocks and annotations

The consumer supports error-recovery: when tree-sitter produces a parse tree
containing `ERROR`/`MISSING` nodes, the consumer still walks the recovered tree
and extracts what it can, marking the file `"parse_ok": false`.

### CST Node Types Depended On

The summary consumer relies on the following CST node types and field names from
the tree-sitter-stm grammar. Changes to any of these require updating the
consumer script.

**Top-level blocks** (identified by node type):

| CST Node Type         | Consumer Section | Key Fields             |
|-----------------------|------------------|------------------------|
| `namespace_decl`      | `blocks`         | `name`                 |
| `workspace_block`     | `blocks`         | `name`                 |
| `import_declaration`  | `blocks`         | `path`                 |
| `integration_block`   | `blocks`         | `name`                 |
| `schema_block`        | `blocks`         | `keyword`, `name`, `description` |
| `fragment_block`      | `blocks`         | `name`, `description`  |
| `map_block`           | `blocks`         | `source`, `target`     |

**Schema members** (identified by node type):

| CST Node Type              | Consumer Section   | Key Fields                     |
|----------------------------|--------------------|--------------------------------|
| `field_declaration`        | `schema_members`   | `name`, `type`, `annotation`, `note` |
| `group_declaration`        | `schema_members`   | `name`                         |
| `array_group_declaration`  | `schema_members`   | `name`                         |

**Map items** (identified by node type):

| CST Node Type        | Consumer Section | Key Fields           |
|----------------------|------------------|----------------------|
| `map_entry`          | `map_items`      | `source`, `target`   |
| `computed_map_entry` | `map_items`      | `source`, `target`   |
| `block_map_entry`    | `map_items`      | `source`, `target`   |
| `nested_map`         | `map_items`      | —                    |

**Path nodes** (identified by node type):

| CST Node Type          | Consumer Section |
|------------------------|------------------|
| `namespaced_path`      | `paths`          |
| `namespaced_field_path`| `paths`          |
| `relative_field_path`  | `paths`          |
| `field_path`           | `paths`          |
| `path_reference`       | `paths`          |

**Other extracted nodes**:

| CST Node Type      | Consumer Section | Notes                          |
|--------------------|------------------|--------------------------------|
| `warning_comment`  | `comments`       | severity = `"warning"`         |
| `question_comment` | `comments`       | severity = `"question"`        |
| `info_comment`     | `comments`       | severity = `"info"`            |
| `note_block`       | `notes`          | field: `value`                 |
| `annotation`       | `annotations`    | field: `name`                  |

### Running the Consumer

Run it from this package directory:

```bash
python3 scripts/cst_summary.py --pretty
```

Or through npm:

```bash
npm run smoke:summary
```

Pass specific files to summarize only those:

```bash
python3 scripts/cst_summary.py ../../examples/db-to-db.stm --pretty
```

### Consumer Tests

The unit test for the summary extractor itself does not require native
compilation — it uses inline tree-dump data:

```bash
python3 scripts/test_cst_summary.py
```

The smoke test runs the full consumer pipeline against every canonical example
and multi-schema file, asserting structural counts and shapes:

```bash
python3 scripts/test_smoke_summary.py
# or: npm run test:smoke
```

## Example Fixture Tests

`test/fixtures/examples/*.json` defines the full-file parser fixtures for the
canonical STM examples in [`examples/`](/Users/thorben/dev/personal/stm/examples).
`test/fixtures/recovery/*.json` defines malformed recovery fixtures for the
required editing states. `scripts/test_fixtures.py` validates that every
root-level example file has a fixture entry, checks that the required recovery
fixtures exist, parses each file through the repo-local Tree-sitter wrapper, and
can assert expected `ERROR`/`MISSING` recovery or specific recovered node shapes.

Run it from this package directory:

```bash
python3 scripts/test_fixtures.py
```

## Local Prerequisites

Generating the parser requires the local `tree-sitter-cli` package. Running
parser tests also requires a working C toolchain. On macOS that means Command
Line Tools or Xcode must be installed and selected so `tree-sitter test` can
compile the generated parser.

Use the repo-local wrapper at [`scripts/tree-sitter-local.sh`](/Users/thorben/dev/personal/stm/scripts/tree-sitter-local.sh) for direct CLI work. It keeps Tree-sitter cache and config inside the repository so sandboxed agent runs do not depend on `~/.cache/tree-sitter` or global config:

```bash
../../scripts/tree-sitter-local.sh parse -p . ../../examples/common.stm --quiet
../../scripts/tree-sitter-local.sh test
```

## Version Target

Current target: STM v1.0.0.

## Non-Goals

- semantic lint rules
- formatting output
- import graph resolution
- type checking
- code generation
