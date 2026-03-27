---
name: excel-to-satsuma
description: Convert Excel mapping spreadsheets into idiomatic Satsuma .stm files. Use when the user has an .xlsx file containing source-to-target data mapping definitions and wants to generate Satsuma output. Three-phase workflow: survey the spreadsheet structure, generate Satsuma with chunked extraction, then critique and refine.
license: MIT
compatibility: Requires Python 3.10+ and openpyxl. Requires tree-sitter for validation (optional, falls back to heuristic checks).
metadata:
  author: satsuma
  version: "1.0"
---

# Excel-to-Satsuma Conversion Skill

You are converting an Excel mapping spreadsheet into well-formed, idiomatic Satsuma `.stm` files.

## Arguments

Parse `$ARGUMENTS` as: `<excel-file> <output-dir> [options]`

Supported options:
- `--tabs "Tab1,Tab2"` — process only these tabs (comma-separated)
- `--max-iterations N` — max critique-refine iterations (default 3)
- `--skip-critique` — generate Satsuma without the critique loop
- `--dry-run` — run Survey only, produce discovery report, stop
- `--no-confirm` — skip user confirmation gate after Survey
- `--overwrite` — allow overwriting existing .stm files in output dir

## Phase 0: Bootstrap & Validation

1. **Check Python + openpyxl**: Run `python3 -c "import openpyxl"`. If it fails, offer to create a venv:
   ```
   cd skills/excel-to-satsuma/scripts && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
   ```
   Then prefix all `python3` commands with `skills/excel-to-satsuma/scripts/.venv/bin/python3`.

2. **Validate input**: Check the Excel file exists and has a `.xlsx` extension.

3. **Check output dir**: If it contains `.stm` files and `--overwrite` was not passed, stop and tell the user.

4. **Create output dir** if it doesn't exist. Also create `<output-dir>/.excel-to-satsuma/` for review artifacts.

## Phase 1: Survey

Use `skills/excel-to-satsuma/scripts/excel_tool.py` for ALL Excel access. Never read the Excel file directly.

### Step 1.1 — Tab Inventory

Run:
```bash
python3 skills/excel-to-satsuma/scripts/excel_tool.py survey <excel-file>
```

### Step 1.2 — Tab Classification

From the survey output, classify each tab as one of:

| Classification | Description |
|---|---|
| **Mapping** | Row-per-field structure with source/target columns |
| **Reference/Lookup** | Code-to-value lookup data (typically small) |
| **Changelog** | Chronological change history |
| **Guidance/Instructions** | Prose documentation about the spreadsheet |
| **Sample Data** | Example data rows, not mapping definitions |
| **Unknown** | Doesn't match any pattern |

Assign each a confidence level (high/medium/low) with brief reasoning.

If `--tabs` was specified, only process those tabs. Still classify all tabs for the report but mark non-selected ones as "skipped (not selected)".

### Step 1.3 — Mapping Tab Deep Dive

For each **Mapping** tab, run:
```bash
python3 skills/excel-to-satsuma/scripts/excel_tool.py headers <excel-file> "<tab-name>"
python3 skills/excel-to-satsuma/scripts/excel_tool.py formatting <excel-file> "<tab-name>"
```

Identify column roles: which columns are source field, source type, target field, target type, transformation logic, comments/notes, status, etc. Infer from header text and sample values.

Propose semantic interpretation of formatting (e.g., "yellow fill = needs review", "strikethrough = deprecated").

### Step 1.4 — Reference Tab Extraction

For **Reference/Lookup** tabs, run:
```bash
python3 skills/excel-to-satsuma/scripts/excel_tool.py lookup <excel-file> "<tab-name>"
```

### Step 1.5 — Discovery Report

Write `<output-dir>/.excel-to-satsuma/discovery-report.md` containing:
- Tab classification table with confidence levels
- Column role assignments for each mapping tab
- Formatting semantic interpretations
- Lookup data summaries
- Any flags or warnings

### User Confirmation Gate

Unless `--no-confirm` was passed, present the discovery summary and ask the user to confirm before proceeding:

```
Survey complete. Here's how I understood your spreadsheet:

  Tabs found: N
  ✓ Tab Name — classification (confidence, X rows, Y columns)
  ✗ Tab Name — classification (skipped)
  ? Tab Name — unknown (skipped)

  Column roles for "Mapping Tab":
    A: Source Field, B: Source Type, ...

Does this look correct? If not, tell me what to change.
```

Wait for the user to respond. Apply any corrections they provide.

If `--dry-run` was specified, stop here after writing the discovery report.

## Phase 2: Translate

### Load Satsuma Knowledge

Run `satsuma agent-reference` to load the grammar, conventions, and CLI reference.
Then pick 1-2 example `.stm` files from the workspace that match the mapping's complexity
(1:1, multi-source, nested/list, lookups, fragments) to use as style references.

### Step 2.1 — Plan File Structure

Before generating any Satsuma, plan:
- How many `.stm` files to produce and what each contains
- Which fragments to extract (repeated field patterns in 2+ schemas)
- Whether a shared `common.stm` is needed (fragments, lookups)
- Which mapping blocks map to which source/target schemas

### Step 2.2 — Chunked Generation

Extract mapping rows in chunks (up to 100 rows per request):
```bash
python3 skills/excel-to-satsuma/scripts/excel_tool.py range <excel-file> "<tab>" --rows START:END
```

For each planned `.stm` file:
1. Request the first chunk of rows
2. Generate schema blocks (source, target) and begin mapping block
3. Request subsequent chunks and generate additional mapping entries
4. Write the file to `<output-dir>/`

### Generation Rules

Follow these rules strictly:

- Define `schema` blocks for source and target with all fields, types, and tags before writing mappings
- Use `fragment` for any field pattern appearing 2+ times across schemas
- Use `import` when producing multiple files — shared fragments/lookups go in `common.stm`
- Use natural language strings (`"..."`) for any transformation described in prose that you cannot express as a standard Satsuma transform. **Never invent functions.**
- Use `//!` for data quality warnings mentioned in the spreadsheet
- Use `//?` for anything ambiguous or unresolvable from available information
- Use `note { "..." }` for rich context that doesn't fit in inline comments
- Use `map { ... }` for value mapping lookups found in lookup tabs
- Prefer concise, idiomatic Satsuma — don't over-specify

### Step 2.3 — Validation

After writing each `.stm` file, validate with tree-sitter:
```bash
./scripts/tree-sitter-local.sh parse -p tooling/tree-sitter-satsuma <file.stm> --quiet
```

If it reports errors, fix them before proceeding. If tree-sitter is unavailable, perform heuristic checks:
- Balanced braces
- All mappings reference declared schemas
- No duplicate schema names
- All spread references (`...name`) resolve to declared fragments
- Import paths reference produced files

## Phase 3: Critique & Refine

Skip this phase if `--skip-critique` was passed.

### Critique Checklist

Evaluate the generated Satsuma against the discovery report:

| Category | Check | Severity |
|---|---|---|
| Coverage | Every mapping row has a corresponding `->` entry | FAIL |
| Coverage | All source fields declared in source schema(s) | FAIL |
| Coverage | All target fields declared in target schema(s) | FAIL |
| Coverage | Lookup tabs converted to `map { }` blocks where appropriate | WARN |
| Types | Source/target types match Excel specification | FAIL |
| Types | Type parameters (length, precision) preserved | WARN |
| Transforms | Transformation logic matches Excel description | FAIL |
| Transforms | Value maps cover all codes from lookup tabs | FAIL |
| Transforms | Complex transforms use NL strings, not invented functions | FAIL |
| Idiom | Repeated patterns extracted as fragments | WARN |
| Idiom | Multi-file layout uses imports correctly | FAIL |
| Documentation | Data quality warnings preserved as `//!` | WARN |
| Documentation | Ambiguities flagged as `//?` | WARN |
| Structure | Tree-sitter parse clean (no ERROR nodes) | FAIL |
| Structure | No orphaned schemas (declared but never mapped) | WARN |

Rate each: **PASS**, **FAIL**, **WARN**, or **INFO** with explanation.

### Refinement Loop

```
iteration = 0
max_iterations = 3 (or --max-iterations value)

while iteration < max_iterations:
    run critique checklist
    count = FAIL + WARN items

    if count == 0: exit CLEAN
    if iteration > 0 and count >= previous_count: exit STALLED

    apply targeted fixes (not full regeneration)
    re-run tree-sitter validation
    iteration += 1

if iteration == max_iterations: exit BUDGET
```

### Review Output

Write `<output-dir>/.excel-to-satsuma/review.md` with:
- Full critique checklist results
- Confidence rating:

| Dimension | Rating |
|---|---|
| Structural coverage | High/Medium/Low |
| Transform accuracy | High/Medium/Low |
| Type fidelity | High/Medium/Low |
| Ambiguity level | Count of `//?` markers |
| Fragment reuse | High/Medium/Low |
| Critique result | Clean / N warnings / N failures |
| Exit condition | CLEAN / STALLED / BUDGET |

## Final Summary

After all phases complete, print a summary:
```
Output written to <output-dir>/
  file1.stm       (N mapping entries)
  common.stm      (N fragments, N lookups)
  .excel-to-satsuma/discovery-report.md
  .excel-to-satsuma/review.md (coverage=X, transforms=Y, exit=Z)
```
