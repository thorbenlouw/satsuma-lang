---
name: satsuma-to-excel
description: Convert Satsuma .stm files into professional, stakeholder-ready Excel workbooks. Deterministic, parser-backed export using the satsuma CLI for structural extraction and openpyxl for workbook generation. Produces Overview, Issues, Mapping, Schema, and Lookup tabs with full styling.
license: MIT
compatibility: Requires Python 3.10+ and openpyxl. Requires satsuma CLI (npx satsuma).
metadata:
  author: satsuma
  version: "1.0"
---

# Satsuma-to-Excel Conversion Skill

You are converting Satsuma `.stm` files into professional Excel workbooks for non-technical stakeholders.

## Arguments

Parse `$ARGUMENTS` as: `<stm-file> [additional-files...] -o <output.xlsx> [options]`

Supported options:
- `--targets "t1,t2"` — export only mappings feeding these targets (comma-separated)
- `--title "Custom Title"` — override the workbook title
- `--timestamp "ISO-8601"` — override generation timestamp (for reproducible builds)
- `--no-issues` — omit the Issues tab
- `--no-schemas` — omit schema reference tabs

## Phase 0: Bootstrap & Validation

1. **Check Python + openpyxl**: Run `python3 -c "import openpyxl"`. If it fails, offer to create a venv:
   ```
   cd skills/satsuma-to-excel/scripts && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
   ```
   Then prefix all `python3` commands with `skills/satsuma-to-excel/scripts/.venv/bin/python3`.

2. **Check satsuma CLI**: Run `npx satsuma --version`. If it fails, the satsuma CLI is not available — stop and tell the user.

3. **Validate input**: Check the `.stm` file(s) exist.

4. **Validate output**: If the output path doesn't end in `.xlsx`, stop and tell the user.

## Phase 1: Generate

Run the deterministic conversion script:

```bash
python3 skills/satsuma-to-excel/scripts/stm_to_excel.py <stm-file> [additional-files...] -o <output.xlsx> [options]
```

The script:
1. Calls `satsuma graph --json` for the complete semantic graph
2. Calls `satsuma fields --json` for each schema's field metadata
3. Calls `satsuma warnings --json` for issue extraction
4. Generates a styled Excel workbook with:
   - **Overview** tab: integration title, note, systems table, table of contents
   - **Issues** tab: consolidated warnings (amber) and questions (blue)
   - **Mapping** tabs: field-level mappings with human-readable transforms
   - **Schema** tabs: source and target field listings with metadata
   - **Lookup** tabs: reference tables from `map {}` blocks

If the script fails, check the error message. Common issues:
- Unresolved imports in the `.stm` file (non-fatal warning, output still generated)
- Missing schema name (target scoping with `--targets` specifies a name that doesn't exist)

## Phase 2: Summarize

After generation, report:

```
Generated: <output.xlsx>
  Tabs: N
  Mappings: N (arrow count per mapping)
  Schemas: N (source + target)
  Issues: N warnings, N questions
  Lookups: N reference tables
```

Offer follow-up actions:
- "Would you like to scope to specific targets? Use `--targets schema1,schema2`"
- "Would you like to customize the title? Use `--title \"Custom Title\"`"
- "Open the file to verify the layout looks correct."

## What the Script Does NOT Do

- **No LLM involvement at runtime** — the output is fully deterministic
- **No Satsuma parsing** — all parsing is delegated to the tree-sitter-backed satsuma CLI
- **No round-tripping** — the Excel workbook is a read-only snapshot, not designed for editing back to Satsuma
- **No custom styling** — the styling follows the spec in `features/05-stm-to-excel-export/PRD.md` exactly
