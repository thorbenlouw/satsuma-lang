# Satsuma-to-Excel Export

> **Status: NOT STARTED** — All phases deferred. See `FUTURE-WORK.md`.

## Goal

Generate beautiful, human-readable Excel workbooks from Satsuma files — optimised for stakeholders who live in Excel, not code. The output is a **read-only, point-in-time snapshot** designed for forums, review meetings, and email distribution to non-technical audiences.

This ships in two tiers:
1. **Lite**: A self-contained system prompt that works with any web LLM (ChatGPT, Gemini, Claude.ai). Paste the Satsuma content and the prompt, get a Python script that produces an `.xlsx` file. Zero setup beyond a Python interpreter.
2. **Full**: A deterministic CLI tool (`satsuma-to-excel`) plus a Claude Code skill (`/satsuma-to-excel`) that reads `.stm` files and writes polished Excel workbooks. No LLM involvement at runtime — the output is reproducible.

## Problem

Satsuma is the source of truth for data integration mappings. But the people who need to review, approve, and act on those mappings — business analysts, project managers, data stewards, compliance reviewers — often:

- Don't have (or want) a code editor or terminal
- Need to annotate, highlight, and filter during review meetings
- Need to forward the spec to stakeholders who only accept Excel
- Need a printable, presentation-ready format for governance forums

Today there is no way to get from `.stm` files back to a high-quality Excel representation. Teams either maintain parallel spreadsheets (defeating the single-source-of-truth goal) or send raw `.stm` files that recipients can't open.

## Success Criteria

### Lite variant

1. A user can paste Satsuma content + the system prompt into any capable web LLM and receive a working Python script that generates a well-formatted `.xlsx` file.
2. The generated workbook follows the layout and styling conventions defined in this PRD.
3. The output is visually polished enough to send to a non-technical stakeholder without apology.

### Full variant

4. A user can run `satsuma-to-excel input.stm -o output.xlsx` and receive a deterministic, reproducible Excel workbook.
5. Running the same command twice on the same input produces byte-identical output (excluding timestamp metadata).
6. The user can scope output to specific targets: `satsuma-to-excel input.stm -o output.xlsx --targets warehouse,analytics_db`.
7. The tool resolves imports and expands fragments — the workbook is self-contained.
8. The output handles every Satsuma construct documented in `Satsuma-V2-SPEC.md` gracefully, even if some constructs require prose representation.
9. The workbook is usable in Excel, Google Sheets, and LibreOffice Calc.

## Non-Goals

- **Round-tripping**: This is a one-way export. The Excel is not designed to be parsed back into Satsuma.
- **Editability**: The workbook is optimised for reading, not editing. No data validation dropdowns, no input cells.
- **Complete expressiveness**: Some Satsuma constructs (deeply nested array mappings, complex `map { }` conditionals, natural-language transforms) are represented in simplified prose rather than structured cells. This is intentional — the `.stm` file is the machine-readable version.
- **Real-time sync**: This is a point-in-time snapshot, not a live view. Re-run the tool to get an updated export.
- **Parsing Satsuma**: The Full CLI tool consumes a parsed AST (from tree-sitter) or, as a fallback, applies heuristic text parsing. It does not implement a full Satsuma parser itself.
- **Supporting `.xls` output**: Only `.xlsx` (Office Open XML) is supported.

## Design Principles

### 1. Stakeholder-first layout

Every layout decision optimises for the person reading the workbook in a meeting. Field mappings are the hero content. Technical details (full schema definitions, lookup tables) are accessible but don't dominate.

### 2. Consistent structure, flexible content

The tab structure, column layout, and styling rules are **deterministic and identical** across all Satsuma inputs. A stakeholder who has seen one export immediately knows how to read the next. Content within cells is flexible — natural language transforms, prose descriptions, and comments flow naturally.

### 3. Progressive disclosure

The Overview tab gives the executive summary. The Issues tab surfaces risks. Mapping tabs show the field-level detail. Schema and lookup tabs provide reference material. Row grouping hides complex transform details behind collapsible parent rows.

### 4. Professional and restrained

The styling is corporate-presentation-grade — think consultancy deliverable, not developer debug output. Colour is used sparingly and purposefully: to distinguish warnings from questions, to mark computed fields, to separate source from target. No rainbows.

---

## Workbook Structure

The workbook contains the following tabs, in order:

### Tab 1: `Overview`

A dashboard-style summary — not a dense data table. Layout:

| Row(s) | Content | Styling |
|--------|---------|---------|
| 1 | Integration name (e.g., "Legacy Customer Migration v2") | Merged across columns, 16pt bold, dark charcoal |
| 2 | Blank separator | |
| 3 | Metadata line: `Version: 2.0.0  ·  Author: Data Migration Team  ·  Cardinality: 1:1` | 10pt, gray text |
| 4 | Tags line: `migration, customer, phoenix-project` | 10pt, gray italic |
| 5 | Blank separator | |
| 6–N | Integration note content (from `note { """...""" }` block), rendered as plain text with line breaks preserved. Markdown formatting stripped but structure retained via indentation. | 10pt, wrapped text, light gray background |
| N+1 | Blank separator | |
| N+2 | Systems involved — a small table: | |

**Systems table:**

| Schema | Role | Description |
|--------|------|-------------|
| legacy_sqlserver | Source | CUSTOMER table — SQL Server 2008 |
| postgres_db | Target | Normalized customer schema — PostgreSQL 16 |

Styled as a light Excel Table with header row.

| Row(s) | Content | Styling |
|--------|---------|---------|
| N+4 | Blank separator | |
| N+5 | **Contents** header | 12pt bold |
| N+6+ | Table of contents — one row per tab in the workbook, with tab name (as a hyperlink) and a one-line description | 10pt, hyperlinked tab names |
| Last-1 | Blank separator | |
| Last | `This is a read-only snapshot. The definitive source of truth is the .stm file(s). Generated from: customer-migration.stm, common.stm on 2026-03-17T14:30:00Z` | 9pt italic, amber background (#FFF3CD), full-width merged cell |

**Column width**: Column A set to ~100 characters. Remaining columns auto-fit to content.

### Tab 2: `Issues`

A consolidated view of every `//!` warning and `//?` open question across all mappings and schemas. This is the tab a project manager opens first.

**Columns:**

| Column | Header | Width | Description |
|--------|--------|-------|-------------|
| A | # | 5 | Sequential row number |
| B | Location | 30 | Tab name + row reference (e.g., "Map - CRM to Warehouse, row 12") |
| C | Type | 12 | "Warning" or "Question" |
| D | Description | 80 | The comment text |

**Styling:**
- Warning rows (`//!`): Amber background (#FFF3CD) on the full row, dark amber text (#856404)
- Question rows (`//?`): Blue background (#CCE5FF) on the full row, dark blue text (#004085)
- Header row: Dark charcoal background, white bold text
- Auto-filter enabled
- Freeze top row

**If there are no issues**: The tab still exists, with a single merged cell: "No warnings or open questions found." This confirms the tab was not accidentally omitted.

### Tab 3+: `Map - {Source} to {Target}`

One tab per `mapping` block. This is the hero content. Each tab is named after the mapping, e.g., `Map - CRM to Warehouse`.

If the mapping block uses the short form `mapping { ... }` (no explicit source/target identifiers), the tab name is derived from the integration name or the source/target schema names.

**Columns:**

| Column | Header | Width | Description |
|--------|--------|-------|-------------|
| A | # | 5 | Row number for meeting reference ("let's look at row 12") |
| B | Source | 25 | Source field name, or "—" for computed fields (`=>`) |
| C | Source Type | 15 | Data type with parameters (e.g., `VARCHAR(255)`) |
| D | | 3 | Arrow separator — contains "→" in every data row. Narrow, centered, gray text |
| E | Target | 25 | Target field name |
| F | Target Type | 15 | Data type with parameters |
| G | Req | 5 | "Yes" if target field has `(required)` metadata. Blank otherwise |
| H | Transform | 50 | Human-readable transformation description (see below) |
| I | Tags | 15 | Comma-separated metadata tokens: `pk`, `pii`, `encrypt`, `unique`, `indexed`, etc. Merged from both source and target metadata |
| J | Notes | 40 | Comments from the Satsuma file, colour-coded by type (see below) |

**Transform column — human-readable notation:**

Satsuma syntax is translated to a friendlier form for non-technical readers:

| Satsuma syntax | Excel representation |
|------------|---------------------|
| `{ trim \| lowercase \| validate_email }` | `trim → lowercase → validate email` |
| `map { A: "active", S: "suspended" }` | `A = "active", S = "suspended"` |
| `map { < 1000: "bronze", default: "platinum" }` | Summary in parent row; conditions in grouped child rows |
| `coalesce(0)` | `default to 0 if null` |
| `round(2)` | `round to 2 decimal places` |
| `uuid_v5("namespace", field)` | `generate UUID v5 from field` |
| `now_utc()` | `current UTC timestamp` |
| `* 100` | `multiply by 100` |
| `encrypt(AES-256-GCM, key)` | `encrypt (AES-256-GCM)` |
| `"description..."` (NL string in transform) | The description text verbatim |
| `{ "NL description" \| round(2) }` | `NL description → round to 2 decimal places` |
| Direct mapping (no transform) | *(blank)* |

Transforms that chain multiple operations use " → " as the separator (replacing `|`).

**Notes column — colour coding:**

| Comment type | Cell background | Text colour |
|-------------|----------------|-------------|
| `//` (info) | Default (white/alternating) | Default (dark gray) |
| `//!` (warning) | Amber (#FFF3CD) | Dark amber (#856404) |
| `//?` (question) | Blue (#CCE5FF) | Dark blue (#004085) |

**Computed fields** (those with `-> target` and no source field on the left side of the arrow): Source column shows "—" in italic gray text. Entire row gets a very light gray background (#F0F0F0) to visually distinguish computed fields from mapped fields.

**Row grouping for complex constructs:**

When a mapping entry contains conditional `map { }` blocks or nested array mappings, the entry is split across multiple rows:

- **Parent row**: Contains the source, target, a summary transform (e.g., "Conditional" or "Nested mapping"), and full tags/notes.
- **Child rows**: Indented detail rows showing each branch or nested field. These rows are grouped in Excel's row grouping feature (outline level 2) so they are **collapsible**. When collapsed, only the parent summary row is visible.

Example for a conditional `map { }`:

| # | Source | Source Type | → | Target | Target Type | Req | Transform | Tags | Notes |
|---|--------|-----------|---|--------|-----------|-----|-----------|------|-------|
| 5 | LOYALTY_POINTS | INT | → | loyalty_tier | VARCHAR(20) | | Conditional — see detail | | |
| 5a | | | | | | | < 1,000 = "bronze" | | |
| 5b | | | | | | | < 5,000 = "silver" | | |
| 5c | | | | | | | < 10,000 = "gold" | | |
| 5d | | | | | | | default = "platinum" | | |

Example for a nested array mapping (`each LineItems -> items { ... }`):

| # | Source | Source Type | → | Target | Target Type | Req | Transform | Tags | Notes |
|---|--------|-----------|---|--------|-----------|-----|-----------|------|-------|
| 8 | each LineItems | | → | items | | | Nested mapping — see detail | | |
| 8a | .SKU | STRING | → | .sku | STRING | | uppercase | | |
| 8b | .Quantity | INT | → | .quantity | INT | | | | |

Child rows use 5a, 5b, 5c numbering (not new sequential numbers) to show they belong to the parent.

**Mapping-level notes**: If the mapping block has a `note { """...""" }` block, it is rendered as a merged row above the data rows, spanning all columns, with a light gray background and wrapped text. This provides context before the field-level detail.

**Tab-level formatting:**
- Header row: Dark charcoal (#2F3542), white bold text, bottom border
- Alternating row fill: White / very light gray (#F8F9FA)
- Freeze panes: Top row + column A (row numbers always visible)
- Auto-filter: Enabled on all columns
- Column D (arrow): Center-aligned, gray text, no filter
- Print layout: Landscape, fit to page width, header row repeats on every page

### Tab N+1: `Src - {Name}` / `Tgt - {Name}`

One tab per schema involved in the exported mappings, classified as source or target by its role in the mapping blocks. These are reference tabs — the full field listing including fields that may not appear in any mapping.

**Columns:**

| Column | Header | Width | Description |
|--------|--------|-------|-------------|
| A | # | 5 | Sequential row number |
| B | Field | 25 | Field name |
| C | Type | 20 | Data type with parameters |
| D | PK | 5 | "Yes" if `(pk)` metadata |
| E | Required | 8 | "Yes" if `(required)` metadata |
| F | Unique | 8 | "Yes" if `(unique)` metadata |
| G | Default | 15 | Value from `(default ...)` metadata |
| H | Tags | 20 | All other metadata tokens: `pii`, `encrypt`, `indexed`, `format email`, `ref table.field`, `enum {…}`, etc. |
| I | Notes | 40 | Inline comments, field-level `(note "...")` content |

**Styling:**
- PK rows: Subtle blue-gray background (#E8EDF2)
- PII-tagged fields: Purple indicator text in Tags column (#6F42C1)
- Notes column: Same colour coding as mapping tabs (amber for warnings, blue for questions)
- Header, alternating rows, freeze panes, auto-filter: Same as mapping tabs

**Schema-level notes**: If the schema block has a `(note "...")` or `(note """...""")` in its metadata, it is rendered as a merged row above the data rows (same as mapping-level notes).

**Fragment expansion**: When a schema uses `...fragment_name`, the fragment's fields are expanded inline. Each expanded field has a note in the Notes column: "From fragment: {fragment_name}". The fragment fields are visually grouped (outline level 2) and collapsible, with a parent row showing the fragment name and description.

| # | Field | Type | ... | Notes |
|---|-------|------|-----|-------|
| 6 | *address_fields* | | | Fragment: Standard address (4 fields) |
| 6a | line1 | STRING(200) | | From fragment: address_fields |
| 6b | line2 | STRING(200) | | From fragment: address_fields |
| 6c | city | STRING(100) | | From fragment: address_fields |
| 6d | postal_code | STRING(20) | | From fragment: address_fields |

### Tab N+2: `Ref - {Name}`

One tab per `lookup` block referenced by the exported mappings.

**Layout**: Simple two-column (or multi-column) Excel Table matching the lookup's structure:

| Code | Description |
|------|-------------|
| OP | open |
| IP | in_progress |
| SH | shipped |
| CN | cancelled |

**Styling:**
- Formatted as an Excel Table object with a light table style
- Header row: Dark charcoal, white bold text
- Auto-filter enabled
- If the lookup has a description string, it is shown as a merged row above the table

### Tab ordering rules

Tabs are ordered to follow the stakeholder's reading flow:

1. `Overview` — always first
2. `Issues` — always second (even if empty)
3. Mapping tabs — ordered as they appear in the Satsuma file(s)
4. Target schema tabs — ordered as they appear in the Satsuma file(s)
5. Source schema tabs — ordered as they appear in the Satsuma file(s)
6. Lookup/reference tabs — alphabetical by name

---

## Styling Specification

### Colour Palette

All colours are chosen for accessibility (WCAG AA contrast) and professional appearance.

| Purpose | Background | Text | Usage |
|---------|-----------|------|-------|
| Header row | #2F3542 (dark charcoal) | #FFFFFF (white), bold | All data tab headers |
| Alternating row (even) | #F8F9FA (very light gray) | Default | All data tabs |
| Alternating row (odd) | #FFFFFF (white) | Default | All data tabs |
| Warning (`//!`) | #FFF3CD (light amber) | #856404 (dark amber) | Notes column, Issues tab |
| Question (`//?`) | #CCE5FF (light blue) | #004085 (dark blue) | Notes column, Issues tab |
| Computed field row | #F0F0F0 (light gray) | Italic gray (#6C757D) for Source column | Mapping tabs |
| PK field row | #E8EDF2 (blue-gray) | Default | Schema tabs |
| PII indicator | — | #6F42C1 (purple) | Tags column |
| Snapshot warning | #FFF3CD (light amber) | #856404 (dark amber) | Overview tab, last row |
| Arrow column | — | #ADB5BD (medium gray) | Column D in mapping tabs |

### Typography

| Element | Font | Size | Style |
|---------|------|------|-------|
| Integration title | Calibri | 16pt | Bold |
| Section headers | Calibri | 12pt | Bold |
| Metadata line | Calibri | 10pt | Regular, gray |
| Column headers | Calibri | 10pt | Bold, white |
| Data cells | Calibri | 10pt | Regular |
| Snapshot warning | Calibri | 9pt | Italic |
| Computed field source | Calibri | 10pt | Italic, gray |

### Excel Features

| Feature | Applied to | Notes |
|---------|-----------|-------|
| Freeze panes | All data tabs | Top row frozen; Column A frozen on mapping tabs |
| Auto-filter | All data tabs | Enabled on header row |
| Row grouping | Mapping tabs, schema tabs | Complex transforms, fragment expansions — collapsed by default |
| Excel Tables | Lookup/reference tabs | Named table objects with light styling |
| Hyperlinks | Overview tab (table of contents) | Each tab name links to its sheet |
| Print layout | All tabs | Landscape, fit to width, header row repeats |
| Column widths | All tabs | Set explicitly per column (see column specs above) |

---

## Target Scoping

The user specifies which targets to export. The tool then determines the full dependency set:

1. **Selected targets**: The target schemas the user wants in the workbook.
2. **Required mappings**: All `mapping` blocks whose `target { }` references a selected target.
3. **Required sources**: All schemas referenced in those mappings' `source { }` blocks.
4. **Required lookups**: All lookup schemas referenced by `map { }` transforms in those mappings.
5. **Required fragments**: All `fragment` blocks spread (via `...`) into any of the above schemas. Expanded inline (not shown as separate tabs).
6. **Required imports**: All `import` statements needed to resolve the above. Resolved and flattened — the workbook does not expose the multi-file structure.

If no `--targets` flag is provided, **all targets** in the input file(s) are included.

---

## Two Variants

| Variant | Audience | Platform | Deterministic? |
|---------|----------|----------|---------------|
| **Lite** (system prompt) | Anyone with a web LLM + Python | ChatGPT/Gemini/Claude.ai | No — LLM generates the script |
| **Full** (CLI tool) | Engineers with Python | Terminal | Yes — identical output for identical input |

The Lite variant ships first because it:
- Validates the layout and styling decisions before investing in a full CLI tool
- Provides immediate value with minimal infrastructure
- Serves as a specification-by-example for the Full tool's implementation

---

## Variant A: Lite System Prompt

### Concept

A self-contained Markdown file (`satsuma-to-excel-prompt.md`) that a user pastes into a web LLM alongside their Satsuma content. The LLM generates a complete Python script (using `openpyxl`) that, when run, produces the formatted Excel workbook.

The user's workflow:
1. Paste the system prompt into a web LLM
2. Paste the Satsuma file content (or upload the `.stm` file)
3. LLM generates a Python script
4. User runs the script locally (or via Code Interpreter) to produce the `.xlsx`
5. User opens the workbook and reviews

### What the Prompt Contains

#### 1. Role & Goal (~100 tokens)

You are a Satsuma-to-Excel export specialist. The user will provide Satsuma v2 file content. Your job is to generate a Python script (using openpyxl) that produces a beautifully formatted Excel workbook representing the Satsuma content, optimised for non-technical stakeholders.

#### 2. Workbook Layout Specification (~800 tokens)

A condensed version of the tab structure defined in this PRD:
- Overview tab: integration metadata, systems table, table of contents, snapshot warning
- Issues tab: consolidated `//!` warnings and `//?` questions
- Mapping tabs: field-level mappings with source, target, transform, tags, notes
- Schema tabs: full field listings with types and annotations
- Lookup tabs: reference tables

#### 3. Column Definitions (~400 tokens)

Exact column layout for each tab type, including headers, widths, and content rules.

#### 4. Styling Rules (~400 tokens)

The colour palette, typography, and Excel features from the Styling Specification section, expressed as openpyxl instructions:
- Colour codes for headers, alternating rows, warnings, questions, computed fields
- Font specifications (Calibri, sizes, bold/italic)
- Freeze panes, auto-filter, row grouping, print layout

#### 5. Transform Translation Rules (~300 tokens)

The human-readable notation table: how to convert Satsuma pipe chains (`|`), `map { }` blocks, natural-language strings (`"..."`), and other constructs into friendly text.

#### 6. Row Grouping Rules (~200 tokens)

When and how to create parent/child row groups for conditional `map { }` blocks, nested array mappings, and fragment expansions.

#### 7. Example (~400 tokens)

A small Satsuma snippet and the expected Python code it should produce, demonstrating the layout, styling, and transform translation.

#### 8. Generation Rules (~150 tokens)

- Output a single, complete Python script that takes the Satsuma content as a string constant and outputs an `.xlsx` file.
- Use only `openpyxl` — no other dependencies.
- The script must be runnable as-is: `python generate_workbook.py`
- Include a shebang line and a brief usage comment.
- Handle edge cases gracefully (empty mappings, no lookups, no notes).

#### 9. What NOT to Do (~100 tokens)

- Don't skip tabs or columns defined in the layout spec.
- Don't invent styling beyond what's specified.
- Don't generate partial scripts or pseudo-code.
- Don't attempt to parse Satsuma with regex for the Full tool — this prompt is for generating a one-off script for the specific input provided.

### Total Prompt Size

~2,900 tokens. Well within web LLM system prompt capacity.

### Lite Variant Limitations

- The LLM parses Satsuma by reading it as text — structural errors in the Satsuma may produce incorrect output.
- No tree-sitter validation of the input.
- The generated script is specific to the provided Satsuma content — it is not a general-purpose tool.
- Complex Satsuma files (multiple imports, many fragments) may produce less polished output.
- The LLM may take creative liberties with transform translation — the prompt guides but cannot enforce.

### Lite Variant File Location

```
features/05-satsuma-to-excel-export/
├── PRD.md                           # This document
└── satsuma-to-excel-prompt.md          # The self-contained lite prompt
```

---

## Variant B: Full CLI Tool

### Concept

A deterministic Python CLI tool that reads Satsuma files (via tree-sitter AST or heuristic fallback) and produces a formatted Excel workbook. No LLM involvement at runtime — the output is reproducible and identical for identical input.

### Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────┐
│  .stm files │ ──► │  Satsuma Parser  │ ──► │  Workbook    │ ──► │  .xlsx     │
│  (input)    │     │  (tree-sitter│     │  Generator   │     │  (output)  │
│             │     │   or fallback)│     │  (openpyxl)  │     │            │
└─────────────┘     └──────────────┘     └──────────────┘     └────────────┘
                           │
                    Produces intermediate
                    data model (Python
                    dataclasses)
```

#### Layer 1: Satsuma Parser

Reads `.stm` files and produces a structured Python data model (dataclasses). Two strategies:

1. **Tree-sitter (preferred)**: Use the project's tree-sitter grammar to parse Satsuma into a CST, then walk the tree to extract blocks, fields, mappings, transforms, and comments. This is authoritative and handles all valid Satsuma.

2. **Heuristic fallback**: If tree-sitter is not available (parser not compiled), fall back to regex/text-based extraction. This handles the common cases (integration blocks, schema blocks with fields and `( )` metadata, mapping blocks with `->` arrows and `{ }` transforms, comments) but may miss edge cases. A warning is included in the workbook's Overview tab when the fallback parser is used.

The parser resolves `import` statements by reading referenced files relative to the input file's directory.

#### Layer 2: Data Model

A set of Python dataclasses representing the intermediate form:

```python
@dataclass
class Integration:
    name: str
    metadata: dict[str, str]     # cardinality, author, version, etc.
    tags: list[str]
    note: str                    # from note { """...""" } block

@dataclass
class Field:
    name: str
    type: str
    metadata: list[str]          # pk, required, pii, encrypt, indexed, etc.
    default: str | None          # from (default ...)
    enum_values: list[str]       # from (enum {a, b, c})
    note: str                    # from (note "...")
    comments: list[Comment]      # inline // comments
    fragment_origin: str | None  # if expanded from a fragment via ...spread
    children: list[Field]        # for record/list nested structures

@dataclass
class Comment:
    type: str                # "info", "warning", "question"
    text: str

@dataclass
class Schema:
    name: str
    metadata: list[str]      # free-form metadata tokens from ( )
    note: str
    fields: list[Field]

@dataclass
class MappingEntry:
    source_field: str | None     # None for computed (-> target with no source)
    target_field: str
    transform: Transform | None
    metadata: list[str]          # from arrow ( ) metadata
    comments: list[Comment]
    children: list[MappingEntry]  # for nested array mappings

@dataclass
class Transform:
    raw: str                     # original Satsuma text from { }
    human_readable: str          # translated for Excel
    kind: str                    # "direct", "chain", "conditional", "map", "nl", "nested"

@dataclass
class Mapping:
    name: str | None             # mapping label
    source_refs: list[str]       # schemas in source { }
    target_ref: str | None       # schema in target { }
    source_join: str | None      # NL join description from source { }
    note: str                    # from note { """...""" } block
    entries: list[MappingEntry]

@dataclass
class Lookup:
    name: str
    description: str
    entries: list[dict]          # key-value pairs

@dataclass
class StmDocument:
    integration: Integration
    schemas: list[Schema]
    mappings: list[Mapping]
    lookups: list[Lookup]
    fragments: list[Schema]      # fragment blocks
    source_files: list[str]      # paths of all files that contributed
```

#### Layer 3: Target Scoping

Given the user's `--targets` selection (or all targets by default), walk the data model to determine the dependency set:

1. Select target schemas matching `--targets`
2. Select mappings whose `target { }` block references a selected target
3. Select source schemas referenced in those mappings' `source { }` blocks
4. Select lookup schemas referenced by `map { }` transforms in those mappings
5. Collect all comments of type "warning" and "question" across the selected elements

#### Layer 4: Workbook Generator

Consumes the scoped data model and produces the `.xlsx` file using `openpyxl`. This layer is purely deterministic — it makes no decisions about layout or content. It applies the tab structure, column layouts, styling rules, transform translations, and row grouping defined in this PRD.

### Transform Translation

The workbook generator applies deterministic text transformations to convert Satsuma syntax to human-readable form. The translation rules are applied in order:

```python
TRANSFORM_TRANSLATIONS = [
    # Pipe chains → arrow chains
    (r'\s*\|\s*', ' → '),

    # Natural-language strings — pass through verbatim (strip quotes)
    # "..." strings in transform { } are human-readable descriptions
    # (handled programmatically: strip quotes, preserve text as-is)

    # Common pipeline tokens → plain English
    ('trim', 'trim whitespace'),
    ('lowercase', 'convert to lowercase'),
    ('uppercase', 'convert to uppercase'),
    ('title_case', 'convert to title case'),
    ('null_if_empty', 'set null if empty'),
    ('null_if_invalid', 'set null if invalid'),
    ('validate_email', 'validate email format'),
    ('escape_html', 'escape HTML characters'),
    ('to_string', 'convert to text'),
    ('to_number', 'convert to number'),
    ('to_boolean', 'convert to boolean'),
    ('to_utc', 'convert to UTC'),
    ('to_iso8601', 'format as ISO 8601'),
    ('to_e164', 'format as E.164 phone'),
    ('now_utc()', 'current UTC timestamp'),
    ('first', 'take first element'),
    ('last', 'take last element'),

    # Parameterised functions
    (r'coalesce\((.+?)\)', r'default to \1 if null'),
    (r'round\((\d+)\)', r'round to \1 decimal places'),
    (r'truncate\((\d+)\)', r'truncate to \1 characters'),
    (r'max_length\((\d+)\)', r'limit to \1 characters'),
    (r'pad_left\((\d+),\s*"(.+?)"\)', r'pad left to \1 chars with "\2"'),
    (r'pad_right\((\d+),\s*"(.+?)"\)', r'pad right to \1 chars with "\2"'),
    (r'prepend\("(.+?)"\)', r'prepend "\1"'),
    (r'append\("(.+?)"\)', r'append "\1"'),
    (r'replace\("(.+?)",\s*"(.+?)"\)', r'replace "\1" with "\2"'),
    (r'split\("(.+?)"\)', r'split on "\1"'),
    (r'uuid_v5\(.+?\)', 'generate UUID v5'),
    (r'encrypt\((.+?),\s*.+?\)', r'encrypt (\1)'),
    (r'hash\((.+?)\)', r'hash (\1)'),
    (r'parse\("(.+?)"\)', r'parse as "\1"'),

    # Arithmetic
    (r'\*\s*(\d+)', r'multiply by \1'),
    (r'/\s*(\d+)', r'divide by \1'),
    (r'\+\s*(\d+)', r'add \1'),
    (r'-\s*(\d+)', r'subtract \1'),

    # Map blocks → key=value list
    # (handled programmatically, not via regex)

    # Named transform spreads (...name) → resolved inline
    # (handled programmatically: expand referenced transform)
]
```

`map { ... }` blocks are translated programmatically:
- `map { A: "active", S: "suspended" }` → `A = "active", S = "suspended"`
- `map { A: true, I: false }` → `A = Yes, I = No`
- `null` keys → `(empty) = value`
- Wildcard `_` or `default` keys → `(other) = value`
- Conditional maps (`< 1000: "bronze"`) → split into parent + child rows (see Row Grouping)

Natural-language strings in transforms are passed through verbatim:
- `"Extract digits and format as E.164"` → `Extract digits and format as E.164`
- Mixed pipelines: `"Multiply by rate from lookup" | round(2)` → `Multiply by rate from lookup → round to 2 decimal places`

### CLI Interface

```
satsuma-to-excel <input.stm> [additional.stm ...] -o <output.xlsx> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `<input.stm>` | Yes | One or more Satsuma files to process. Imports are resolved relative to each file's directory. |
| `-o, --output` | Yes | Output `.xlsx` file path |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--targets "t1,t2"` | All targets | Export only mappings feeding these targets (comma-separated schema identifiers) |
| `--title "Custom Title"` | Integration name | Override the workbook title on the Overview tab |
| `--no-issues` | false | Omit the Issues tab |
| `--no-schemas` | false | Omit the Src/Tgt schema reference tabs |
| `--collapse-groups` | true | Row groups start collapsed (set false to start expanded) |
| `--timestamp` | Current time | Override the generation timestamp (for reproducible builds) |

**Examples:**

```bash
# Export everything
satsuma-to-excel customer-migration.stm -o customer-migration.xlsx

# Export only the warehouse target
satsuma-to-excel customer-migration.stm -o warehouse-only.xlsx --targets postgres_db

# Multiple input files (with imports between them)
satsuma-to-excel main.stm common.stm -o full-export.xlsx

# Reproducible build (fixed timestamp)
satsuma-to-excel customer-migration.stm -o export.xlsx --timestamp "2026-03-17T00:00:00Z"
```

### Claude Code Skill

In addition to the CLI, a Claude Code skill (`/satsuma-to-excel`) provides a conversational wrapper:

```
/satsuma-to-excel customer-migration.stm -o customer-migration.xlsx
```

The skill prompt (`.claude/commands/satsuma-to-excel.md`) instructs the agent to:
1. Validate the input file exists
2. Run the CLI tool
3. Open and summarise the output (tab count, mapping count, issue count)
4. Offer to adjust (e.g., "Would you like to scope to specific targets?")

This is a thin wrapper — the CLI does all the real work.

### File Structure

```
features/05-satsuma-to-excel-export/
├── PRD.md                           # This document
├── satsuma-to-excel-prompt.md          # Lite system prompt
├── satsuma_to_excel/                   # Python package
│   ├── __init__.py
│   ├── __main__.py                 # CLI entry point
│   ├── parser.py                   # Satsuma parser (tree-sitter + fallback)
│   ├── model.py                    # Data model (dataclasses)
│   ├── scoper.py                   # Target scoping logic
│   ├── transforms.py               # Transform translation rules
│   ├── generator.py                # Workbook generator (openpyxl)
│   └── styles.py                   # Colour palette, fonts, formatting constants
├── requirements.txt                 # openpyxl
└── tests/
    ├── test_parser.py
    ├── test_transforms.py
    ├── test_generator.py
    └── fixtures/                    # Sample Satsuma files + expected outputs
```

### Dependency Management

- **Runtime**: `openpyxl` (pure Python, no C dependencies)
- **Optional**: `tree-sitter`, `tree-sitter-satsuma` (for authoritative parsing — falls back to heuristic if unavailable)
- **Dev**: `pytest` for testing

The tool can be installed via:
```bash
pip install -e features/05-satsuma-to-excel-export/
```

Or run directly:
```bash
python -m satsuma_to_excel customer-migration.stm -o output.xlsx
```

---

## Risks

### Satsuma constructs that don't tabulate well

Deeply nested `record`/`list` structures (3+ levels), multi-source joins, and complex natural-language transforms don't map cleanly to rows and columns.

**Mitigation**: The row grouping pattern handles 1–2 levels of nesting well. For deeper nesting, flatten to dot-path notation (e.g., `Order.LineItems.SKU`) with an explanatory note. For multi-source joins, include the source schema prefix in the source column. Accept that some constructs are better read in the `.stm` file and add a note: "See .stm file for full detail."

### Transform translation fidelity

The deterministic translation rules may produce awkward phrasing for uncommon transform chains, or may not cover every possible Satsuma pipeline token. Natural-language strings (`"..."`) in transforms are passed through verbatim, which works well for most cases but mixed NL + mechanical pipelines may read awkwardly.

**Mitigation**: The translation rules handle the documented Satsuma pipeline tokens from `Satsuma-V2-SPEC.md`. Unknown tokens fall through as raw Satsuma syntax with a light italic style, making them visually distinct but still informative. Natural-language strings are the user's own words, so they pass through cleanly. The Lite variant is more creative (LLM-powered translation) while the Full variant is predictable.

### Large Satsuma files

A file with 500+ mapping entries produces a very long mapping tab.

**Mitigation**: Excel handles thousands of rows natively. Auto-filter and frozen panes make large tabs navigable. The `--targets` flag allows scoping to a subset. Row grouping keeps the default view compact.

### Import resolution

Satsuma files can import from other files using relative paths. The tool must resolve these correctly.

**Mitigation**: Import resolution follows the same semantics as the Satsuma spec: paths are relative to the importing file's directory. The tool reads imported files recursively and flattens the result. Circular imports are detected and reported as errors.

### Tree-sitter parser unavailable

Not every environment will have the tree-sitter parser compiled.

**Mitigation**: The heuristic fallback parser handles common Satsuma patterns. A warning in the Overview tab notes when the fallback was used: "Note: This workbook was generated using heuristic parsing. Some constructs may not be fully represented. For authoritative output, compile the tree-sitter-satsuma parser."

---

## Implementation Plan

### Phase 1: Lite system prompt

Author `satsuma-to-excel-prompt.md` by condensing this PRD's layout, styling, and translation rules into a self-contained LLM prompt. Test against the canonical examples (`db-to-db.stm`, `sfdc_to_snowflake.stm`, `multi-source-hub.stm`) on ChatGPT and Claude.ai. Iterate on prompt wording and example quality.

This phase validates the workbook design before investing in deterministic tooling.

### Phase 2: Data model + heuristic parser

Implement `model.py` (dataclasses) and `parser.py` (heuristic text-based parser). Test against all files in `examples/`. This establishes the intermediate representation that the generator will consume.

### Phase 3: Transform translation

Implement `transforms.py` — the deterministic Satsuma-to-human-readable translation rules. Unit test against a comprehensive set of transform expressions.

### Phase 4: Workbook generator

Implement `generator.py` and `styles.py` — the openpyxl workbook generation. Start with the Overview tab, then Issues, then mapping tabs, then schema tabs, then lookup tabs. Each tab type can be developed and tested independently.

### Phase 5: Target scoping + CLI

Implement `scoper.py` (dependency resolution) and `__main__.py` (CLI argument parsing). Wire up the full pipeline: parse → scope → generate.

### Phase 6: Tree-sitter parser integration

Add tree-sitter-based parsing as the preferred strategy in `parser.py`. This requires the tree-sitter-satsuma grammar to be compiled. The heuristic parser remains as a fallback.

### Phase 7: Claude Code skill

Create `.claude/commands/satsuma-to-excel.md` as a thin wrapper around the CLI tool.

### Phase 8: End-to-end validation

Test both variants against all canonical examples. Compare Lite vs Full output quality. Document any edge cases or known limitations. Create sample output workbooks for the `examples/` directory.
