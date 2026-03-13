# STM Implementation Guide

## Architecture & Technical Decisions for Building STM Tooling

---

## 1. Implementation Priorities

The STM toolchain should be built in this order, each layer unlocking the next:

```
Layer 0:  Grammar definition (tree-sitter / PEG)
Layer 1:  Parser → AST
Layer 2:  Linter / Validator (consumes AST)
Layer 3:  Formatter (consumes AST → emits formatted STM)
Layer 4:  Language Server Protocol (LSP) → IDE integration
Layer 5:  Code generators (AST → Python / Java / SQL / dbt)
Layer 6:  Visualizer (AST → interactive diagram)
Layer 7:  AI agent tooling (system prompts, conversion agents)
```

**Do not skip the parser.** Everything downstream depends on a correct, well-tested AST. Invest heavily here.

---

## 2. Parser Strategy

### 2.1 Recommended approach: Tree-sitter

**Why tree-sitter:**

- Incremental parsing (essential for IDE integration)
- Error recovery (partial parses on invalid input — critical for AI-generated content)
- Multi-language bindings (Rust core, bindings for Node.js, Python, Go, etc.)
- VS Code integration is native (via tree-sitter grammars)
- Battle-tested at scale (used by GitHub, Neovim, Zed, Helix)

**Alternative: PEG parser (pest for Rust, PEG.js for JS)**

Simpler to write initially, but lacks incremental parsing and error recovery. Acceptable for a CLI linter; insufficient for IDE integration.

**Recommendation:** Start with tree-sitter. The grammar complexity is moderate (~50-80 rules) and well within tree-sitter's sweet spot. The upfront investment pays off immediately when building the LSP.

### 2.2 AST Design

The parser should produce a typed AST. Here's a sketch of the node types:

```typescript
// Top-level file
interface STMFile {
  imports: ImportDecl[]
  integration?: IntegrationBlock
  schemas: SchemaBlock[]
  fragments: FragmentBlock[]
  maps: MapBlock[]
}

// Imports
interface ImportDecl {
  kind: 'wildcard' | 'named'
  path: string
  names?: { name: string; alias?: string }[]
}

// Integration metadata
interface IntegrationBlock {
  name: string
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:M'
  author?: string
  version?: string
  tags?: string[]
  notes: Note[]
  comments: Comment[]
}

// Schema blocks (source, target, lookup, etc.)
interface SchemaBlock {
  keyword: 'source' | 'target' | 'table' | 'message' | 'record' | 'event' | 'schema' | 'lookup'
  id: string
  description?: string
  annotations: Annotation[]
  selectionCriteria?: string
  notes: Note[]
  members: (Field | Group | Spread | Comment)[]
}

// Fragment blocks
interface FragmentBlock {
  id: string
  description?: string
  members: (Field | Group | Spread | Comment)[]
}

// Fields
interface Field {
  name: Identifier            // plain or backtick-quoted
  type: TypeExpr
  tags: Tag[]
  annotations: Annotation[]
  note?: Note
  comments: Comment[]         // inline comments on same line
}

interface TypeExpr {
  name: string
  params?: (string | number)[]
}

interface Tag {
  name: string
  value?: string | number | string[]
}

// Groups (nested objects / arrays)
interface Group {
  name: Identifier
  isArray: boolean            // true if declared with []
  annotations: Annotation[]
  notes: Note[]
  members: (Field | Group | Spread | Comment)[]
}

// Annotations
interface Annotation {
  name: string                // format, xpath, pos, filter, ns, header, path
  params?: (string | number)[]
  // For @ns: key-value form
  key?: string
  value?: string
}

// Spread (fragment inclusion)
interface Spread {
  fragmentId: string
}

// Identifiers
interface Identifier {
  raw: string                 // as written (may include backticks)
  resolved: string            // actual name (backticks stripped, doubled backticks resolved)
  quoted: boolean
}

// Notes
interface Note {
  content: string             // raw markdown content (dedented)
}

// Comments  
interface Comment {
  severity: 'info' | 'warn' | 'question'   // //, //!, //?
  text: string
}

// ============================================================
// Map blocks
// ============================================================

interface MapBlock {
  source?: string             // schema ID (null for implicit 1:1)
  target?: string             // schema ID (null for implicit 1:1)
  options?: MapOption[]
  annotations: Annotation[]
  notes: Note[]
  entries: (MapEntry | NestedMap | Comment)[]
}

interface MapOption {
  name: string                // flatten, group_by, when
  value: string | number
}

// A single mapping line
interface MapEntry {
  kind: 'direct' | 'computed'
  sourcePath?: FieldPath      // null for computed (=>)
  targetPath: FieldPath
  transforms: TransformExpr[]
  note?: Note
  comments: Comment[]
}

// Nested array mapping
interface NestedMap {
  sourcePath: FieldPath
  targetPath: FieldPath
  notes: Note[]
  entries: (MapEntry | NestedMap | Comment)[]
}

// Field paths
interface FieldPath {
  schemaId?: string           // explicit qualification (null if implicit)
  isRelative: boolean         // true for .field paths
  segments: PathSegment[]
}

interface PathSegment {
  name: Identifier
  isArray: boolean            // true if []
}

// ============================================================
// Transform expressions
// ============================================================

type TransformExpr =
  | PipeChain
  | ValueMap
  | WhenChain
  | NaturalLanguage
  | FallbackExpr
  | LiteralExpr

interface PipeChain {
  kind: 'pipe'
  steps: TransformStep[]
}

interface TransformStep {
  kind: 'function' | 'arithmetic' | 'value_map'
  function?: string
  params?: (string | number)[]
  operator?: '*' | '/' | '+' | '-'
  operand?: number
  valueMap?: { key: string | 'null' | '_'; value: string | number | boolean | null }[]
}

interface ValueMap {
  kind: 'value_map'
  pairs: { key: string | 'null' | '_'; value: string | number }[]
}

interface WhenChain {
  kind: 'when'
  branches: { condition: string; value: string | number | boolean | null }[]
  elseBranch?: string | number | boolean | null
}

interface NaturalLanguage {
  kind: 'nl'
  intent: string
}

interface FallbackExpr {
  kind: 'fallback'
  path: FieldPath
  transforms: TransformStep[]
}

interface LiteralExpr {
  kind: 'literal'
  value: string | number | boolean | null
}
```

### 2.3 Parse error strategy

STM will frequently be written by AI agents, which means **partial parses on invalid input are essential**. The parser should:

1. Parse as much as possible, collecting errors
2. Skip to the next recognizable boundary (typically next top-level block or next mapping line) on error
3. Return a partial AST with error nodes marked
4. Report all errors with line/column positions

This enables the linter and LSP to provide useful feedback even on malformed input.

---

## 3. Linter / Validator

The linter consumes the AST and performs semantic analysis. It should be implementable as a single pass over the AST.

### 3.1 Error rules (E-series)

These are fatal — the spec is invalid:

| Code | Check | Implementation |
|---|---|---|
| E001 | Schema ID uniqueness | Collect all IDs into a set; flag duplicates |
| E002 | Schema ID format | Regex: `^[a-zA-Z][a-zA-Z0-9_-]*$` |
| E003 | Source path resolution | For each map entry source path, walk the source schema AST to verify the field exists |
| E004 | Target path resolution | Same for target paths |
| E005 | Lookup resource exists | For each `lookup()` call, verify the resource ID is in scope |
| E006 | Circular imports | Build import graph, detect cycles with DFS |
| E007 | Import conflicts | After resolving all imports, check for ID collisions |
| E008 | Fragment used as endpoint | Verify fragment IDs never appear as source/target in map block headers |
| E009 | Empty backtick identifier | Length check on resolved identifier |
| E010 | Multiple integration blocks | Count integration blocks per file |
| E015 | Nested map arrays | Verify nested map source/target heads both end in array segments |

### 3.2 Warning rules (W-series)

These are advisory — the spec is valid but potentially incomplete:

| Code | Check | Implementation |
|---|---|---|
| W001 | Cardinality mismatch | Count source/target schemas, compare to declared cardinality |
| W002 | Required field unmapped | For each `[required]` target field, verify a map entry exists (or `[default]` is set) |
| W003 | Unused source field | Collect all source fields, subtract those referenced in map entries |
| W004 | Unused target field | Same for target fields |
| W005 | `nl()` present | Flag as needing manual/AI implementation |
| W006 | Open questions | Count `//?` comments |
| W007 | Unnecessary backticks | Check if backtick-quoted identifier matches unquoted pattern |
| W008 | Type mismatch | Direct mapping between obviously incompatible types (INT → EMAIL) without transform |

### 3.3 CLI interface

```bash
# Validate a single file
stm lint integration.stm

# Validate all files in a project
stm lint .

# Output formats
stm lint --format text integration.stm     # human-readable (default)
stm lint --format json integration.stm     # for CI/CD
stm lint --format sarif integration.stm    # for GitHub code scanning

# Strictness levels
stm lint --strict integration.stm          # warnings become errors
stm lint --ignore W003,W004 integration.stm # suppress specific warnings
```

---

## 4. Formatter

The formatter takes an AST and emits consistently formatted STM. This is critical for:

- Normalizing AI-generated output
- Enforcing team style conventions
- Making diffs clean and readable

### 4.1 Formatting rules

**Schema blocks:**

```
| Column alignment:
|   field_name     TYPE_EXPR     [tags]     // comment
|   ^^^^^^^^^^^    ^^^^^^^^^     ^^^^^^     ^^^^^^^^^^
|   Left-aligned   Left-aligned  Left-aligned  Preserved
|
| Type column starts at: max(field_name_length) + 4 spaces (minimum)
| Tag column starts at:  max(type_expr_length) + 4 spaces (minimum)
```

**Map blocks:**

```
| Mapping alignment:
|   source_field -> target_field     : transform
|   ^^^^^^^^^^^^    ^^^^^^^^^^^^     ^^^^^^^^^^^
|   Left-aligned    Left-aligned     Left-aligned
|
| Arrow -> aligned across consecutive mappings
| Transform : aligned across consecutive mappings (when on same line)
```

**Indentation:** 2 spaces per level (configurable in stm.config).

**Blank lines:** One blank line between logical sections within a block. Two blank lines between top-level blocks.

**Canonical normalization:**

- one field or group declaration per line
- one map head per line
- one transform per continuation line for multiline mappings
- `enum` tag values always use braces with comma-separated items; wrap long lists across lines
- map options ordered as `flatten`, `group_by`, `when`, then custom options alphabetically
- annotations remain postfix on the same declaration line
- notes are always emitted as explicit trailing blocks

### 4.2 CLI interface

```bash
# Format a file in place
stm fmt integration.stm

# Check formatting without modifying (for CI)
stm fmt --check integration.stm

# Format to stdout
stm fmt --stdout integration.stm

# Format all .stm files in project
stm fmt .
```

---

## 5. Language Server Protocol (LSP)

An LSP server enables IDE features. Priority features:

### 5.1 Phase 1 (essential)

- **Syntax highlighting** (via tree-sitter grammar)
- **Diagnostics** (lint errors/warnings shown inline)
- **Go to definition** (click a schema ID in a map block → jump to schema block)
- **Find references** (right-click a field → show all map entries that reference it)

### 5.2 Phase 2 (quality of life)

- **Autocomplete** (field names in map blocks, transform function names, schema IDs)
- **Hover information** (hover a field in map block → show type, tags, notes from schema)
- **Document symbols** (outline view showing schemas and map blocks)
- **Rename symbol** (rename a schema ID or field across all references)
- **Code actions** (quick fixes for common lint warnings)

### 5.3 Phase 3 (advanced)

- **Semantic highlighting** (different colors for source vs target fields in map blocks)
- **Inlay hints** (show resolved type for computed fields)
- **Code lens** (show mapping coverage on schema fields: "3 mappings" / "unmapped")

---

## 6. Code Generation Strategy

Code generators consume the AST and produce runnable transformation code.

### 6.1 Architecture

```
                    ┌──────────────┐
                    │   STM File   │
                    └──────┬───────┘
                           │ parse
                           ▼
                    ┌──────────────┐
                    │     AST      │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Python  │ │   Java   │ │   SQL    │
        │ Generator│ │ Generator│ │ Generator│
        └──────────┘ └──────────┘ └──────────┘
```

### 6.2 Generation approach

For each map entry, the generator:

1. Resolves the source path to a concrete accessor expression
2. Resolves the target path to a concrete assignment expression
3. Chains transform functions into language-specific function calls
4. For `nl()` expressions: emits a TODO comment with the intent text, or calls an AI agent to generate the implementation

**Example — Python output for a mapping line:**

```stm
EMAIL_ADDR -> email : trim | lowercase | validate_email | null_if_invalid
```

Generated Python:

```python
def transform_email(source: dict) -> Optional[str]:
    """Map: legacy_sqlserver.EMAIL_ADDR -> postgres_db.email"""
    value = source.get('EMAIL_ADDR')
    if value is None:
        return None
    value = value.strip()                    # trim
    value = value.lower()                    # lowercase
    if not validate_email(value):            # validate_email
        return None                          # null_if_invalid
    return value
```

**Example — `nl()` expression:**

```stm
PHONE_NBR -> phone
  : nl("Normalize to E.164, assume US if ambiguous")
```

Generated Python:

```python
def transform_phone(source: dict) -> Optional[str]:
    """Map: legacy_sqlserver.PHONE_NBR -> postgres_db.phone"""
    value = source.get('PHONE_NBR')
    if value is None:
        return None
    # TODO: nl() — Normalize to E.164, assume US if ambiguous
    #   Implement this transform manually or use AI generation.
    raise NotImplementedError(
        "Natural language transform requires implementation: "
        "Normalize to E.164, assume US if ambiguous"
    )
```

### 6.3 Standard transform library

Each target language needs a runtime library implementing the standard transforms. This is a relatively small surface area:

```
stm-runtime-python/
  stm_transforms/
    __init__.py
    strings.py       # trim, lowercase, uppercase, title_case, truncate, etc.
    nulls.py         # coalesce, null_if_empty, null_if_invalid
    dates.py         # parse, to_iso8601, to_utc, assume_utc, now_utc
    numbers.py       # round, floor, ceil, to_number
    validation.py    # validate_email, to_e164, validate(pattern)
    crypto.py        # encrypt, decrypt, hash
    types.py         # to_string, to_boolean, uuid_v5
    lookups.py       # lookup function with on_miss handling
```

---

## 7. Visualizer

A web-based visualizer that renders STM as an interactive diagram.

### 7.1 Rendering approach

The visualizer should show:

- **Schema blocks as cards** with fields listed, color-coded by type
- **Map entries as lines/arrows** connecting source fields to target fields
- **Transform annotations** shown on hover or inline
- **Warnings/questions** highlighted with color (amber for `//!`, blue for `//?`)
- **Coverage overlay** — unmapped fields dimmed or flagged

### 7.2 Technology choices

- React + D3.js or React Flow for the interactive diagram
- Tree-sitter WASM for in-browser parsing
- Monaco editor (VS Code's editor) for a split-pane "edit + preview" experience

---

## 8. AI Agent Tooling

### 8.1 System prompt templates

Provide copy-paste system prompt blocks for:

- **Claude** (Anthropic)
- **GPT-4** (OpenAI)
- **Gemini** (Google)

Each contains the grammar (~500 tokens) and cheat sheet (~400 tokens).

### 8.2 Excel-to-STM conversion agent

A purpose-built agent prompt that:

1. Reads an Excel mapping spreadsheet (as CSV or via file upload)
2. Identifies columns (source field, target field, transform, notes, etc.)
3. Infers schema structure from the data
4. Produces a valid `.stm` file
5. Uses `nl()` for any transform it can't parse to a standard function
6. Preserves all notes and comments from the Excel

### 8.3 STM-to-code generation agent

An agent prompt that:

1. Reads a `.stm` file
2. Generates implementation code in the target language
3. For `nl()` blocks, generates best-effort implementation and marks it for review
4. Produces tests based on the mapping spec

### 8.4 Mapping review agent

An agent prompt that:

1. Reads a `.stm` file and the corresponding implementation code
2. Compares them for drift
3. Reports unmapped fields, incorrect transforms, missing edge cases
4. Suggests fixes in both the spec and the code

---

## 9. Technology Recommendations

### 9.1 Implementation language

**Rust** is the recommended primary language:

- Tree-sitter grammars are written in JS but the parser runtime is C/Rust
- Excellent WASM compilation (browser visualizer, VS Code extension)
- Fast CLI tools (`stm lint`, `stm fmt`)
- Strong type system matches the AST design
- Growing ecosystem for language tooling (tower-lsp, etc.)

**TypeScript** as secondary for:

- VS Code extension UI layer
- Web visualizer
- Quick prototyping of code generators

**Python** for:

- Runtime transform library (most data engineers use Python)
- Code generator output
- AI agent integration (LangChain, etc.)

### 9.2 Project structure

```
stm/
├── grammar/
│   ├── tree-sitter-stm/          # Tree-sitter grammar definition
│   │   ├── grammar.js            # Grammar rules
│   │   ├── src/                  # Generated C parser
│   │   └── test/                 # Grammar test corpus
│   └── queries/                  # Syntax highlighting queries
│       ├── highlights.scm
│       └── locals.scm
│
├── crates/                       # Rust workspace
│   ├── stm-parser/               # AST types + tree-sitter integration
│   │   ├── src/
│   │   │   ├── ast.rs            # AST type definitions
│   │   │   ├── parse.rs          # Tree-sitter → AST conversion
│   │   │   └── lib.rs
│   │   └── Cargo.toml
│   │
│   ├── stm-lint/                 # Linter / validator
│   │   ├── src/
│   │   │   ├── rules/            # One file per rule
│   │   │   │   ├── e001_unique_ids.rs
│   │   │   │   ├── w002_required_mapped.rs
│   │   │   │   └── ...
│   │   │   ├── runner.rs         # Orchestrates rules
│   │   │   └── lib.rs
│   │   └── Cargo.toml
│   │
│   ├── stm-fmt/                  # Formatter
│   │   ├── src/
│   │   │   ├── layout.rs         # Formatting rules
│   │   │   └── lib.rs
│   │   └── Cargo.toml
│   │
│   ├── stm-lsp/                  # Language server
│   │   ├── src/
│   │   │   ├── server.rs
│   │   │   ├── completions.rs
│   │   │   ├── diagnostics.rs
│   │   │   └── hover.rs
│   │   └── Cargo.toml
│   │
│   └── stm-cli/                  # CLI binary
│       ├── src/
│       │   └── main.rs           # Subcommands: lint, fmt, parse, convert
│       └── Cargo.toml
│
├── packages/
│   ├── vscode-stm/               # VS Code extension
│   │   ├── syntaxes/             # TextMate grammar (fallback)
│   │   ├── src/                  # Extension code
│   │   └── package.json
│   │
│   └── stm-visualizer/           # Web-based visualizer
│       ├── src/
│       └── package.json
│
├── runtimes/
│   ├── python/                   # Python transform runtime
│   │   ├── stm_transforms/
│   │   ├── tests/
│   │   └── pyproject.toml
│   │
│   └── java/                     # Java transform runtime
│       └── ...
│
├── generators/
│   ├── python/                   # STM → Python code generator
│   ├── java/                     # STM → Java code generator
│   └── sql/                      # STM → SQL code generator
│
├── ai/
│   ├── system-prompts/           # LLM system prompt templates
│   │   ├── claude.md
│   │   ├── gpt4.md
│   │   └── gemini.md
│   ├── agents/                   # Agent prompt templates
│   │   ├── excel-to-stm.md
│   │   ├── stm-to-code.md
│   │   └── mapping-review.md
│   └── cheatsheet.md             # Compact reference for context injection
│
├── examples/                     # Canonical examples
│   ├── db-to-db.stm
│   ├── rest-to-esb-xml.stm
│   ├── edi-to-json.stm
│   ├── multi-source-hub.stm
│   ├── csv-with-backticks.stm
│   ├── supplier-composite.stm
│   └── shared-library/
│       ├── common-lookups.stm
│       ├── common-types.stm
│       └── address-fragment.stm
│
├── spec/
│   ├── STM-SPEC.md               # Formal language specification
│   └── GRAMMAR.ebnf              # Standalone EBNF grammar
│
├── docs/
│   ├── PROJECT-OVERVIEW.md       # Vision and motivation
│   ├── IMPLEMENTATION-GUIDE.md   # This document
│   ├── TUTORIAL.md               # Getting started guide
│   └── MIGRATION-FROM-EXCEL.md   # How to convert existing spreadsheets
│
└── tests/
    ├── corpus/                   # Parser test cases
    │   ├── valid/                # Valid STM files (must parse cleanly)
    │   └── invalid/              # Invalid STM files (must produce correct errors)
    ├── lint/                     # Linter test cases
    └── format/                   # Formatter test cases (input → expected output)
```

---

## 10. Testing Strategy

### 10.1 Parser tests

Use tree-sitter's built-in test corpus format. Each test case is a `.stm` snippet paired with expected AST output:

```
==================
Simple field declaration
==================

source test {
  name VARCHAR(100) [required]
}

---

(file
  (schema_block
    keyword: "source"
    id: "test"
    (field
      name: "name"
      type: (type_expr name: "VARCHAR" params: ("100"))
      tags: ((tag name: "required")))))
```

### 10.2 Linter tests

Each lint rule gets a set of test cases: STM input + expected diagnostics:

```yaml
# tests/lint/e003_source_path.yaml
- name: "Valid source path"
  input: |
    source s { name STRING }
    target t { n STRING }
    map { name -> n }
  expected: []

- name: "Invalid source path"
  input: |
    source s { name STRING }
    target t { n STRING }
    map { nonexistent -> n }
  expected:
    - code: E003
      line: 3
      message: "Source path 'nonexistent' does not exist in schema 's'"
```

### 10.3 Round-trip tests

Parse → format → parse → compare ASTs. This ensures the formatter doesn't lose information.

### 10.4 Example validation

All canonical examples in `/examples` must pass `stm lint` with zero errors.

---

## 11. MVP Scope

For an initial release, focus on:

1. **Tree-sitter grammar** — complete, tested, handles all syntax
2. **Parser** (Rust) — tree-sitter → AST conversion
3. **Linter** (Rust) — E001-E010 errors, W001-W004 warnings
4. **CLI** (`stm lint`, `stm parse --json`)
5. **VS Code extension** — syntax highlighting + diagnostics
6. **5 canonical examples** — tested and passing lint
7. **AI cheat sheet** — tested with Claude and GPT-4

Everything else (formatter, code generators, visualizer, LSP completions) is Phase 2.
