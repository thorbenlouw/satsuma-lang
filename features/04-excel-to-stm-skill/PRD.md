# Excel-to-Satsuma Agent Skill

> **Status: IMPLEMENTED** — Lite system prompt, Python CLI tool (`excel_tool.py` with 5 subcommands), and full Claude Code skill prompt (`/excel-to-satsuma`) are complete. End-to-end validation (Phase 5) is outstanding. See `skills/excel-to-satsuma/` for the Agent Skill package.

## Goal

Enable any user — from a BA with a web browser to an engineer with Claude Code — to convert an Excel-based source-to-target mapping spreadsheet into well-formed, idiomatic Satsuma files.

This ships in two tiers:
1. **Lite**: A self-contained system prompt that works with any web LLM (ChatGPT, Gemini, Claude.ai). Upload the prompt and your spreadsheet, get Satsuma output. Zero setup.
2. **Full**: A Claude Code agent skill (`/excel-to-satsuma`) with code-first Excel extraction, tree-sitter validation, iterative self-critique, and a confidence-rated review. The full skill treats the Excel file as an opaque artefact — it never loads the full spreadsheet into LLM context. All interrogation happens through targeted Python code (openpyxl).

## Problem

Source-to-target mappings live in Excel spreadsheets across virtually every enterprise data team. These spreadsheets are:

- **Structurally inconsistent** — every team invents its own layout, column naming, colour coding, and tab organisation.
- **Semantically ambiguous** — a "Transformation" column might contain pseudo-code, English prose, lookup references, or nothing at all.
- **Mixed-purpose** — tabs may contain mapping rows, changelogs, interpretation guides, links to external docs, sample data, or stakeholder sign-off matrices.
- **Large** — production mapping docs routinely have 200–500+ rows across multiple tabs.

There is no reliable way to convert these to Satsuma by hand without significant effort and risk of transcription error. An AI skill that does this iteratively — with structured self-review — would dramatically lower the barrier to Satsuma adoption.

## Success Criteria

### Lite variant

1. A BA can upload the prompt + an Excel file to any major web LLM and get syntactically plausible Satsuma output.
2. The output uses idiomatic Satsuma patterns — not just generic code formatting.
3. The self-critique checklist catches obvious issues (missing fields, invented functions).
4. For a typical 50–100 row mapping spreadsheet, the output is >80% correct on first pass.

### Full variant

5. A user can run `/excel-to-satsuma path/to/mapping.xlsx output-dir/` and receive valid Satsuma files.
6. The skill handles spreadsheets it has never seen before — no hardcoded column assumptions.
7. Non-mapping tabs (changelogs, guidance, reference links) are identified and excluded gracefully.
8. The generated Satsuma is syntactically valid (verified by tree-sitter parse) and uses idiomatic patterns (fragments, imports, `nl()` for ambiguous transforms, tiered comments).
9. The skill produces a discovery report, structured critique, and multi-dimensional confidence rating alongside the Satsuma output.
10. The skill errors clearly if a spreadsheet is too large to process reliably rather than silently degrading.
11. The user is shown the discovery report and asked to confirm before Satsuma generation begins.

## Non-Goals

- Parsing non-Excel formats (.csv, Google Sheets, .ods). Future work.
- Supporting `.xls` (legacy format) — users should convert to `.xlsx` first (e.g., via LibreOffice).
- Semantic validation of the generated Satsuma against a running system.
- Generating executable code (Python, SQL, dbt) from the Satsuma. That is a downstream consumer.
- Handling password-protected or macro-enabled workbooks (.xlsm).
- Replacing human review — the confidence rating and critique are there precisely because this is advisory output.
- Incremental re-runs or diffing against previously generated Satsuma. Future work.

## Two Variants

This feature ships in two forms, in order:

| Variant | Audience | Platform | Requires |
|---------|----------|----------|----------|
| **Lite** (system prompt) | BAs without coding agents | Any web LLM (ChatGPT, Gemini, Claude.ai) | Upload Excel + paste/upload prompt |
| **Full** (Claude Code skill) | Engineers with Claude Code | Claude Code CLI | Python, openpyxl, tree-sitter |

The Lite variant ships first because it:
- Provides immediate value with zero infrastructure
- Validates the core approach (can an LLM produce good Satsuma from Excel?) before investing in tooling
- Serves the primary adopter persona (BAs migrating from spreadsheets)
- Informs the design of the Full skill's generation rules and critique checklist

---

## Variant A: Lite System Prompt

### Concept

A single, self-contained Markdown file (`excel-to-satsuma-prompt.md`) that a user uploads or pastes into any capable web LLM alongside their Excel file. The prompt contains everything the LLM needs: the Satsuma grammar, generation rules, examples, and a self-critique checklist. No code execution, no tooling, no environment setup.

The LLM reads the Excel file natively (most web LLMs can now open `.xlsx` uploads), does its best to produce Satsuma, and self-critiques the output. The user then validates locally using the tree-sitter parser or other tools.

### Audience

Business analysts, data architects, or anyone who:
- Has a mapping spreadsheet and wants to try Satsuma
- Doesn't have Claude Code, a terminal, or Python installed
- Wants a quick conversion to review and refine, not a perfect first pass

### What the Prompt Contains

The file is structured as a system prompt with these sections:

#### 1. Role & Goal (~100 tokens)

You are a Satsuma conversion specialist. The user will upload an Excel spreadsheet containing source-to-target data mapping definitions. Your job is to convert it into well-formed, idiomatic Satsuma files.

#### 2. Satsuma Grammar — compact EBNF

Inlined verbatim from `AI-AGENT-REFERENCE.md` grammar section.

#### 3. Satsuma Conventions & Rules

Inlined verbatim from `AI-AGENT-REFERENCE.md` conventions section. Covers metadata tokens, backtick quoting, namespace references, transforms, metric rules, consumer conventions, `@ref` usage, and comments.

#### 4. Generation Workflow (~300 tokens)

Step-by-step instructions:

1. **Survey the spreadsheet** — identify which tabs contain mapping data vs. reference/lookup data vs. documentation/changelog. Report your findings before generating.
2. **Identify column roles** — determine which columns are source field, source type, target field, target type, transformation, notes, etc. Don't assume fixed positions.
3. **Plan the output** — decide how many Satsuma files to produce, whether shared fragments or lookups are needed.
4. **Generate Satsuma** following the rules below.
5. **Self-critique** against the checklist below.
6. **Report confidence** honestly.

#### 5. Generation Rules (~250 tokens)

- Start with an `integration` block (name, cardinality).
- Define `source` and `target` blocks with all fields, types, and tags before writing mappings.
- Use `lookup` blocks for reference/code tables found in the spreadsheet.
- Use `fragment` for any field pattern that appears 2+ times across schemas.
- Use `nl("...")` for any transformation described in prose that you can't express as a standard Satsuma transform. **Never invent functions.**
- Use `//!` for data quality warnings mentioned in the spreadsheet.
- Use `//?` for anything ambiguous or unresolvable from the available information.
- Use `note '''...'''` for rich context that doesn't fit in inline comments.
- Use `when`/`else` for conditional logic, not nested `map`.
- Prefer concise, idiomatic Satsuma — don't over-specify.

#### 6. Excel-to-Satsuma Conversion Example (~350 tokens)

Inlined from `AI-AGENT-REFERENCE.md`: the "Converting an Excel mapping row to Satsuma" example showing an Excel row and its Satsuma equivalent, plus the minimal 1:1 mapping example showing a complete small file.

#### 7. Self-Critique Checklist (~300 tokens)

A simplified version of the Full skill's critique checklist, designed for the LLM to self-evaluate:

> After generating Satsuma, review your output against this checklist. Report each item as PASS, FAIL, or WARN with a brief explanation.
>
> - **Coverage**: Every mapping row in the Excel has a corresponding `->` or `=>` entry
> - **Coverage**: All source fields declared in source schema(s)
> - **Coverage**: All target fields declared in target schema(s)
> - **Types**: Source/target types match the Excel specification
> - **Transforms**: Transformation logic matches the Excel description
> - **Transforms**: Value maps cover all codes listed in the Excel
> - **Transforms**: Complex transforms use `nl()` rather than invented functions
> - **Idiom**: Repeated patterns extracted as fragments
> - **Idiom**: Schema keywords chosen appropriately (source/target/lookup/table etc.)
> - **Documentation**: Data quality warnings preserved as `//!`
> - **Documentation**: Ambiguities flagged as `//?`
> - **Structure**: Balanced braces, valid block nesting
> - **Structure**: No orphaned schemas (declared but never referenced in mapping)

#### 8. Output Format Instructions (~150 tokens)

- Output each `.stm` file in a separate code block with a filename header.
- If the platform supports file downloads, offer downloadable `.stm` files.
- After the Satsuma output, include:
  - The self-critique checklist results
  - A confidence summary (structural coverage, transform accuracy, type fidelity, ambiguity count)
  - A note reminding the user to validate with the tree-sitter parser

#### 9. What NOT to Do (~100 tokens)

- Don't skip tabs without explaining why.
- Don't silently drop mapping rows that are hard to interpret — use `nl()` or `//?`.
- Don't invent Satsuma syntax or transform functions not in the grammar/cheat sheet.
- Don't produce partial output without flagging it.
- Don't claim the output is validated — remind the user it needs local verification.

### Total Prompt Size

~2,500 tokens. Well within the system prompt capacity of any current web LLM. The prompt is dense but not overwhelming — an LLM can hold all of it in working memory while processing the spreadsheet.

### What the Lite Variant Does NOT Do

- No code execution — the LLM reads the Excel natively, not via openpyxl
- No chunked extraction — the LLM sees whatever the platform loads from the file
- No tree-sitter validation — structural correctness is best-effort
- No iterative refinement loop with separate critic — just a one-pass self-critique
- No guaranteed handling of very large spreadsheets — LLM file reading has platform-specific limits
- No machine-readable metadata or review artifacts — just the Satsuma output and inline critique

### Lite Variant Limitations (documented for users)

The prompt includes a brief "limitations" note for the user:

> **Important**: This is a best-effort conversion. The generated Satsuma has NOT been parsed or validated. Before using it:
> 1. Run it through the Satsuma tree-sitter parser to check syntax
> 2. Review all `//?` markers — these are open questions that need human judgement
> 3. Review all `nl()` transforms — these describe intent but need implementation
> 4. Check that all mapping rows from your spreadsheet are accounted for

### Lite Variant File Location

```
features/04-excel-to-satsuma-skill/
├── PRD.md                         # This document
├── excel-to-satsuma-prompt.md        # The self-contained lite prompt
└── ...
```

---

## Variant B: Full Claude Code Skill

Everything below describes the Full skill variant (`/excel-to-satsuma`).

## Architecture

### Design Principle: Code-First Excel Access

The LLM must **never** read raw spreadsheet content directly into its context window. All Excel interrogation happens via a Python CLI tool (`excel_tool.py`) using `openpyxl`. Each subcommand extracts a specific, bounded slice of information and returns structured Markdown. This keeps context usage proportional to what the LLM actually needs to reason about.

If the extracted data for any step is too large, the skill must **stop and tell the user** which tab/section is too large and suggest manual scoping (e.g., "specify which tabs to process").

### Phased Architecture

The skill runs as a **single Claude Code conversation** organised into three distinct phases, each with a clear responsibility boundary. This is not a multi-agent system — it is a single skill prompt that works through phases sequentially, loading only the information needed for each phase.

| Phase | Responsibility | Information needed |
|-------|---------------|-------------------|
| **Survey** | Interrogate Excel structure and content. Produce discovery report. No Satsuma knowledge needed. | `excel_tool.py` output only |
| **Translate** | Interpret discovery report and generate Satsuma files. No direct Excel access. | Discovery report + Satsuma spec (`AI-AGENT-REFERENCE.md`) + canonical examples + chunked row data via `excel_tool.py` |
| **Critique & Refine** | Evaluate generated Satsuma against structured checklist. Fix issues iteratively. | Discovery report + generated Satsuma + Satsuma spec + tree-sitter parse output |

Between Survey and Translate, there is a **user confirmation gate**: the skill presents the discovery report and waits for the user to confirm or correct before proceeding.

## Detailed Workflow

### Phase 0: Bootstrap & Input Validation

Before any processing:

1. **Check Python dependency**: Verify `openpyxl` is importable. If not, offer to create a project-local venv and install it:
   ```
   openpyxl is required but not installed.
   Shall I create a venv at ./features/04-excel-to-satsuma-skill/.venv and install it?
   ```
   Store the venv path so subsequent runs are zero-friction.
2. **Validate input file**: Verify the file exists and is a valid `.xlsx` file.
3. **Size check**: Run `excel_tool.py survey` to get tab counts, row counts, and total cell count. If total cells exceed 50,000, error with actionable guidance:
   ```
   This spreadsheet has ~65,000 cells across 12 tabs.
   That exceeds the reliable processing limit.

   Options:
   1. Specify which tabs to process: /excel-to-satsuma file.xlsx output/ --tabs "Customer,Order"
   2. Split the spreadsheet into smaller files.
   ```
4. **Check output directory**: If the output directory contains existing `.stm` files, error unless `--overwrite` is passed:
   ```
   Output directory ./stm-output/ already contains .stm files.
   Use --overwrite to replace them, or choose a different directory.
   ```
5. Create the output directory if it doesn't exist.

### Phase 1: Survey

The Survey phase interrogates the Excel file through targeted extractions. It does **not** dump full tab contents.

#### Step 1.1 — Tab Inventory

Run `excel_tool.py survey` to extract per-tab metadata:
- Tab name, row count (excluding empty trailing rows), column count
- Whether the tab has filters applied, merged cells, frozen panes
- First 3 rows (headers + 2 sample rows) as a preview

#### Step 1.2 — Tab Classification

Using the tab inventory, classify each tab as one of:

| Classification | Description |
|----------------|-------------|
| **Mapping** | Row-per-field mapping structure with source/target columns |
| **Reference/Lookup** | Code-to-value lookup data, typically small |
| **Changelog** | Chronological change history |
| **Guidance/Instructions** | Prose-heavy documentation about how to read the spreadsheet |
| **Sample Data** | Example data rows, not mapping definitions |
| **Unknown** | Doesn't match any pattern — flag for user review |

Each classification gets a confidence level (high/medium/low) and a brief reasoning explanation.

#### Step 1.3 — Mapping Tab Deep Dive

For each tab classified as **Mapping**, run `excel_tool.py headers` and `excel_tool.py formatting` to extract:

- **Column role identification**: Which columns represent source field, source type, target field, target type, transformation logic, comments/notes, status, etc. Inferred from header text, column position, and sample values.
- **Formatting semantics**: Conditional formatting rules, distinct fill colours and their frequency, hidden rows/columns, data validation rules, row groupings. Propose semantic interpretation of formatting (e.g., "yellow fill = optional", "strikethrough = deprecated").

#### Step 1.4 — Reference Tab Extraction

For tabs classified as **Reference/Lookup**, run `excel_tool.py lookup` to extract full content (these are typically small, capped at 500 rows). These become Satsuma `lookup` blocks.

#### Step 1.5 — Guidance Tab Summary

For tabs classified as **Guidance/Instructions**, extract a brief summary of content. This gives the Translate phase context about how the spreadsheet authors intended the mapping to be read.

#### Output: Discovery Report

A single `discovery-report.md` file written to the output directory's `.excel-to-satsuma/` subdirectory. Contains:
- Tab classification table with confidence levels
- Column role assignments for each mapping tab
- Formatting semantic interpretations
- Lookup data summaries
- Guidance tab summaries
- Any flags or warnings about the spreadsheet structure

### User Confirmation Gate

After the Survey phase, the skill **always** presents the discovery summary to the user and asks for confirmation before proceeding:

```
Survey complete. Here's how I understood your spreadsheet:

  Tabs found: 6
  ✓ Customer Mapping  — mapping (high confidence, 142 rows, 8 columns)
  ✓ Order Mapping     — mapping (high confidence, 87 rows, 10 columns)
  ✓ Code Tables       — reference/lookup (high confidence, 3 lookup tables)
  ✗ Change Log        — changelog (skipped)
  ✗ Instructions      — guidance (skipped, but summary extracted)
  ? Sign-off          — unknown (skipped)

  Column roles for "Customer Mapping":
    A: Source Field, B: Source Type, C: Target Field, D: Target Type,
    E: Transformation, F: Notes, G: Status, H: Priority

  Full discovery report written to .excel-to-satsuma/discovery-report.md

Does this look correct? If not, tell me what to change before I generate Satsuma.
```

The user can correct classifications, override column roles, or exclude/include tabs. Only after confirmation does the skill proceed.

Use `--no-confirm` to skip this gate (e.g., for scripted usage).

### Phase 2: Translate

The Translate phase works from the confirmed discovery report. It loads Satsuma knowledge by reading:
- `AI-AGENT-REFERENCE.md` — compact grammar + conventions reference
- 1–2 canonical examples from `examples/` appropriate to the mapping's cardinality and complexity

It does **not** receive raw Excel data upfront. When it needs specific cell values, it requests targeted ranges via `excel_tool.py range`.

#### Step 2.1 — Plan the Satsuma File Structure

Before writing any Satsuma, produce a file plan:

- How many `.stm` files to produce and what each contains.
- Which fragments to extract (repeated field patterns appearing in multiple schemas or mappings).
- Whether a shared `common.stm` or `lookups.stm` file is needed.
- Which mapping blocks map to which source/target schemas.
- Cardinality of the overall integration.

The plan is informed by the tab structure but **not bound to it** — multiple tabs may contribute to a single Satsuma file, or a single tab may produce multiple files.

#### Step 2.2 — Chunked Satsuma Generation

Mapping rows are always extracted in chunks (up to 100 rows per request via `excel_tool.py range`). For each chunk, the skill generates Satsuma entries and appends to the file being built. This is the default extraction strategy, not a fallback for large files.

For each planned file:

1. Request the first chunk of rows from the relevant mapping tab.
2. Generate schema blocks (source, target) and begin the mapping block.
3. Request subsequent chunks and generate additional mapping entries.
4. Repeat until all rows for this file are processed.

Key generation rules:
- **Use fragments** for any field pattern that appears 2+ times.
- **Use imports** when producing multiple files — shared fragments and lookups go in a common file.
- **Use `nl()`** for any transformation described in English prose that can't be expressed as a standard Satsuma transform function. Don't invent functions.
- **Use `//!`** for any data quality warning mentioned in the Excel (conditional formatting, comments, colour coding that indicates issues).
- **Use `//?`** for any ambiguity that cannot be resolved from the available information.
- **Use `note '''...'''`** blocks to preserve important context from the Excel that doesn't fit in inline comments.
- **Prefer concise, idiomatic Satsuma** — avoid verbose or over-specified mappings when a simpler expression works.

#### Step 2.3 — Tree-Sitter Validation

After generating each `.stm` file, validate it using the project's tree-sitter parser:

```bash
./scripts/tree-sitter-local.sh parse -p tooling/tree-sitter-satsuma <file.stm> --quiet
```

If tree-sitter reports parse errors, fix them before proceeding. If tree-sitter is not available (parser not compiled), fall back to heuristic structural checks with a warning:
- Balanced braces and brackets
- All `mapping` blocks reference declared schemas
- No duplicate schema identifiers
- All fragment spreads (`...name`) reference declared fragments
- Imports reference files that were actually produced

### Phase 3: Critique & Refine

After all Satsuma files pass structural validation, the skill enters the critique loop.

#### Critique Checklist

The skill evaluates the generated Satsuma against the discovery report using this checklist:

| Category | Check | Severity |
|----------|-------|----------|
| **Coverage** | Every mapping-classified row in the Excel has a corresponding map entry in Satsuma | FAIL |
| **Coverage** | All source fields declared in source schema(s) | FAIL |
| **Coverage** | All target fields declared in target schema(s) | FAIL |
| **Coverage** | Lookup/reference tabs converted to `lookup` blocks where appropriate | WARN |
| **Types** | Source/target types match Excel specification | FAIL |
| **Types** | Type parameters (length, precision) preserved | WARN |
| **Transforms** | Transformation logic matches Excel description | FAIL |
| **Transforms** | Value maps cover all codes listed in Excel | FAIL |
| **Transforms** | Complex transforms use `nl()` rather than invented functions | FAIL |
| **Idiom** | Conditional logic uses `when`/`else`, not nested `map` | WARN |
| **Idiom** | Repeated patterns extracted as fragments | WARN |
| **Idiom** | Multi-file layout uses imports correctly | FAIL |
| **Idiom** | Schema keywords chosen appropriately (source/target/lookup/message etc.) | WARN |
| **Documentation** | Data quality warnings from Excel preserved as `//!` | WARN |
| **Documentation** | Ambiguities flagged as `//?` | WARN |
| **Documentation** | Formatting/colour semantics documented in notes | INFO |
| **Structure** | Tree-sitter parse clean (no ERROR nodes) | FAIL |
| **Structure** | No orphaned schemas (declared but never mapped) | WARN |
| **Structure** | Cardinality in integration block matches actual mapping structure | WARN |

Each item receives: **PASS**, **FAIL**, **WARN**, or **INFO** with a specific explanation and, for FAIL/WARN, a concrete remediation instruction.

#### Refinement Loop

```
iteration = 0
max_iterations = 3  (configurable via --max-iterations)

while iteration < max_iterations:
    run critique checklist
    count = number of FAIL + WARN items

    if count == 0:
        exit: CLEAN                    # all checks pass

    if iteration > 0 and count >= previous_count:
        exit: STALLED                  # no improvement — stop wasting tokens

    apply targeted fixes (not full regeneration)
    re-run tree-sitter validation
    iteration += 1

if iteration == max_iterations:
    exit: BUDGET                       # max iterations reached
```

Exit conditions:
- **CLEAN**: 0 FAIL, 0 WARN — the output is high quality.
- **STALLED**: FAIL+WARN count did not decrease from the previous iteration — further iterations won't help.
- **BUDGET**: Maximum iterations reached — report remaining issues honestly.

The exit condition is reported in `review.md`.

### Phase 4: Output

The skill writes the following to the user-specified output directory:

```
output-dir/
├── *.stm                          # Generated Satsuma file(s) — the deliverable
├── common.stm                     # Shared fragments/lookups (if applicable)
└── .excel-to-satsuma/                 # Review artifacts (gitignore-able)
    ├── discovery-report.md        # How the skill understood the spreadsheet
    ├── review.md                  # Final critique + confidence rating
    └── meta.json                  # Machine-readable metadata (source file, timestamp, iterations, exit condition)
```

The `.stm` files are the primary output — ready to commit to version control. The `.excel-to-satsuma/` subdirectory contains review artifacts that are useful for human review but can be gitignored.

#### Confidence Rating (in review.md)

Multi-dimensional, not a single score:

| Dimension | Rating | Explanation |
|-----------|--------|-------------|
| **Structural coverage** | High/Medium/Low | Were all mapping rows accounted for? |
| **Transform accuracy** | High/Medium/Low | How many transforms were expressible vs. required `nl()`? |
| **Type fidelity** | High/Medium/Low | Were types directly mappable or required interpretation? |
| **Ambiguity level** | Count | Number of `//?` open questions in output |
| **Fragment reuse** | High/Medium/Low | Were repeated patterns identified and extracted? |
| **Critique result** | Clean / N warnings / N failures | Final critique status after all iterations |
| **Exit condition** | CLEAN / STALLED / BUDGET | How the refinement loop terminated |

## Information Budget Management

The skill must be disciplined about what information is loaded at each decision point. The constraint is not a hard token limit — Claude Code manages context automatically — but **information density**: the LLM makes better decisions when it sees only what's relevant.

### Per-Phase Information Needs

| Phase | What the LLM needs to see | What stays out |
|-------|--------------------------|----------------|
| **Survey** | Tab metadata, sample rows, formatting summaries (from `excel_tool.py`) | Satsuma spec, examples, raw cell data |
| **User Confirmation** | Discovery summary (compact) | Everything else |
| **Translate** | Confirmed discovery report + Satsuma spec + 1–2 examples + chunked row data | Full spreadsheet content, formatting details already captured |
| **Critique** | Generated Satsuma + discovery report + critique checklist + tree-sitter output | Raw Excel data, examples |

### Chunking Strategy (default, not fallback)

All mapping tab row extraction uses chunked access:
- **Chunk size**: Up to 100 rows per `excel_tool.py range` call.
- **Sequential tab processing**: If more than 5 mapping tabs, process one at a time.
- **Wide tabs (>30 columns)**: Auto-select relevant columns based on column role classification. If roles are ambiguous, ask the user.
- **Hard limit**: If total estimated mapping rows exceed 2,000, error with guidance to scope via `--tabs`.

## Python Tooling

The skill depends on a single Python CLI tool for all Excel access. This tool is a stateless utility — it takes arguments, returns structured output, and has no side effects.

### `excel_tool.py`

A single entry point with subcommands:

```
excel_tool.py survey <file.xlsx>
    → Markdown: tab names, row/column counts, merged cells, frozen panes,
      filter states, first 3 rows per tab as preview

excel_tool.py headers <file.xlsx> <tab-name>
    → Markdown: column headers, first N sample rows, inferred column data types

excel_tool.py formatting <file.xlsx> <tab-name>
    → Markdown: conditional formatting rules, distinct fill colours + frequency,
      hidden rows/cols, data validation rules, row groupings

excel_tool.py range <file.xlsx> <tab-name> [--rows START:END] [--cols A:H]
    → Markdown: cell values for the specified range, with headers

excel_tool.py lookup <file.xlsx> <tab-name> [--max-rows 500]
    → Markdown: full tab content (for small reference/lookup tabs, with row cap)
```

All subcommands:
- Return structured Markdown to stdout (readable by both humans and LLMs).
- Return a non-zero exit code and an error message on failure.
- Enforce a maximum output size and truncate with a warning if exceeded.
- Depend only on `openpyxl` (pure Python, no C dependencies).

### Dependency Management

`excel_tool.py` requires `openpyxl`. The skill manages this via a project-local venv:

- **Location**: `features/04-excel-to-satsuma-skill/.venv/`
- **First run**: If openpyxl is not importable, the skill offers to create the venv and install it.
- **Subsequent runs**: The skill uses the existing venv automatically.
- **The venv is gitignored.**

## Skill File Structure

The skill is packaged as a Claude Code custom slash command:

```
.claude/
└── commands/
    └── excel-to-satsuma.md           # Skill prompt file

features/04-excel-to-satsuma-skill/
├── PRD.md                         # This document
├── excel_tool.py                  # Python CLI for Excel access
├── requirements.txt               # openpyxl
└── .venv/                         # Project-local venv (gitignored)
```

### Skill Prompt Design

The skill prompt file (`.claude/commands/excel-to-satsuma.md`) contains:

1. **Role and goal statement** — what the skill does and its design principles.
2. **Phase instructions** — step-by-step instructions for each phase, including what tools to use and what information to load.
3. **Satsuma reference loading instructions** — explicit paths to read:
   - `AI-AGENT-REFERENCE.md` for grammar and cheat sheet
   - Specific example files from `examples/` based on mapping complexity
4. **Generation rules** — the key generation rules from Phase 2 above.
5. **Critique checklist** — the full checklist table.
6. **Output format instructions** — directory structure and file contents.

The prompt does **not** inline the Satsuma spec or examples — it instructs the agent to read them at the appropriate phase. This keeps the prompt itself compact and the context loading lazy.

### Argument Passing

Arguments are passed via the `$ARGUMENTS` variable that Claude Code provides to slash commands:

```
/excel-to-satsuma ~/mappings/customer-migration.xlsx ./stm-output/
/excel-to-satsuma ~/mappings/customer-migration.xlsx ./stm-output/ --tabs "Customer,Order"
/excel-to-satsuma ~/mappings/customer-migration.xlsx ./stm-output/ --dry-run
```

## Skill Interface

### Invocation

```
/excel-to-satsuma <excel-file> <output-dir> [options]
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--tabs "Tab1,Tab2"` | All tabs | Process only the specified tabs |
| `--max-iterations` | 3 | Maximum critique-refine iterations |
| `--skip-critique` | false | Generate Satsuma without the critique loop (faster, less reliable) |
| `--dry-run` | false | Run Survey only, produce discovery report, no Satsuma generation |
| `--no-confirm` | false | Skip the user confirmation gate after Survey |
| `--overwrite` | false | Overwrite existing `.stm` files in the output directory |

### Example Session

```
> /excel-to-satsuma ~/mappings/customer-migration.xlsx ./stm-output/

Checking dependencies... ✓ openpyxl available

Surveying customer-migration.xlsx...
  Found 6 tabs: Customer Mapping, Order Mapping, Code Tables, Change Log, Instructions, Sign-off
  Classified: 2 mapping, 1 reference, 1 changelog, 1 guidance, 1 unknown (skipped)

  Column roles for "Customer Mapping":
    A: Source Field, B: Source Type, C: Target Field, D: Target Type,
    E: Transformation, F: Notes, G: Status, H: Priority

  Full discovery report written to .excel-to-satsuma/discovery-report.md

Does this look correct? [confirm to proceed]

> yes, but "Sign-off" tab is actually a lookup table for approval status codes

Got it — reclassifying "Sign-off" as reference/lookup.

Generating Satsuma...
  Reading AI-AGENT-REFERENCE.md for Satsuma grammar...
  Using examples/sfdc_to_snowflake.stm as reference (1:1 mapping with lookups)
  Planned: 3 files (customer.stm, order.stm, common.stm)

  Generating customer.stm (142 rows, 2 chunks)...
  Generating order.stm (87 rows, 1 chunk)...
  Generating common.stm (2 fragments, 2 lookups)...

  Tree-sitter validation: all 3 files parse clean ✓

Critique iteration 1: 1 FAIL, 2 WARN
  FAIL: Value map for status codes missing "Pending" value from Excel
  WARN: Fragment not extracted for repeated address fields
  WARN: Minor type parameter mismatch (VARCHAR(50) vs VARCHAR(80))

Critique iteration 2: 0 FAIL, 0 WARN — clean pass ✓

Output written to ./stm-output/
  customer.stm          (42 mapping entries)
  order.stm             (28 mapping entries)
  common.stm            (2 fragments, 2 lookups)
  .excel-to-satsuma/discovery-report.md
  .excel-to-satsuma/review.md  (coverage=High, transforms=Medium, types=High, exit=CLEAN)
```

## Risks

### Excel format diversity

Every spreadsheet is different. Tab classification and column role identification will sometimes be wrong.

**Mitigation**: The user confirmation gate catches misclassifications before they propagate into Satsuma generation. Low-confidence classifications are explicitly flagged. The user can correct, reclassify, or exclude tabs before proceeding.

### Large spreadsheets

A 500-row mapping tab with 20 columns is ~10,000 cells of content.

**Mitigation**: Chunked extraction is the default path, not a fallback. The skill never requests more than 100 rows at a time. If the total mapping surface exceeds 2,000 rows, it errors early with actionable guidance (use `--tabs` to scope).

### Transform ambiguity

Excel "Transformation" columns frequently contain ambiguous English prose, inconsistent notation, or references to external documents.

**Mitigation**: The skill uses `nl()` liberally for anything it can't confidently express as a standard Satsuma transform. The critique phase checks that ambiguous transforms were flagged, not silently dropped or invented.

### Critique-loop stalling

The critique may identify issues the skill can't fix (e.g., ambiguous source data).

**Mitigation**: Stall detection (no improvement in FAIL+WARN count) triggers early exit. Hard cap at configurable max iterations (default 3). The final `review.md` honestly reports any unresolved items and the exit condition.

### Tree-sitter parser unavailable

The tree-sitter parser may not be compiled in every environment.

**Mitigation**: The skill attempts tree-sitter validation first. If the parser binary is not available, it falls back to heuristic structural checks and includes a warning in `review.md` that parse validation was not performed.

## Implementation Plan

### Phase 0: Lite system prompt

Author `excel-to-satsuma-prompt.md` by assembling the grammar, cheat sheet, examples, generation rules, and self-critique checklist from existing materials (`AI-AGENT-REFERENCE.md`, canonical examples). Test against 2–3 sample spreadsheets on ChatGPT and Gemini. Iterate on the prompt wording based on output quality.

This phase validates the core conversion approach and generation rules before any tooling investment. Lessons learned here feed directly into the Full skill's generation rules and critique checklist.

### Phase 1: Python CLI tool (`excel_tool.py`)

Build and test the Python CLI tool with all five subcommands (`survey`, `headers`, `formatting`, `range`, `lookup`). Test against a diverse set of sample spreadsheets. This is the foundation — everything in the Full skill depends on reliable, targeted Excel extraction.

Includes: `requirements.txt`, venv bootstrap logic, output size enforcement.

### Phase 2: Skill prompt — Survey phase

Write the skill prompt file (`.claude/commands/excel-to-satsuma.md`) with the Survey phase instructions, user confirmation gate, and `--dry-run` support. Test the survey flow end-to-end against varied spreadsheet layouts.

### Phase 3: Skill prompt — Translate phase

Extend the skill prompt with Satsuma generation instructions. Start with single-tab, 1:1 mapping spreadsheets. Add chunked extraction, tree-sitter validation, and multi-tab/multi-file support incrementally.

### Phase 4: Skill prompt — Critique & Refine phase

Add the critique checklist and refinement loop to the skill prompt. Tune exit conditions. Wire up the full end-to-end flow.

### Phase 5: End-to-end validation

Test both variants against 5–10 real-world mapping spreadsheets of varying complexity. Document failure modes, tune heuristics, and update prompts based on observed issues. Compare Lite vs. Full output quality to quantify the value of the tooling investment.
