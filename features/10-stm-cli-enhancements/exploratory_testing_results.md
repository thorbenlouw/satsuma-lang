# Exploratory Testing Results — Feature 10 CLI Structural Primitives

Date: 2026-03-18
Tested against: `examples/` corpus (11 STM files)

---

## Bugs Found and Fixed

### 1. `--unmapped-by` broken for source schemas (FIXED)
**Command:** `stm fields legacy_sqlserver --unmapped-by "customer migration"`
**Expected:** Only 6 address fields (not directly arrow-mapped)
**Actual (before fix):** All 21 fields shown — `getMappedTargets` only checked target field names
**Root cause:** `getMappedTargets` collected arrow *target* names but compared against *source* schema field names. When the queried schema is the source side of a mapping, none of its fields appear as targets.
**Fix:** Replaced `getMappedTargets` with `getMappedFieldNames` that checks both `arrow.source` and `arrow.target` based on whether the queried schema is the source or target in the mapping.

### 2. `context` field/type column collision (FIXED)
**Command:** `stm context "migration" ../../examples/db-to-db.stm`
**Expected:** `tax_identifier_encrypted TEXT` (with space)
**Actual (before fix):** `tax_identifier_encryptedTEXT` — no space separator
**Root cause:** `padEnd(24)` is a no-op when the field name is >= 24 characters.
**Fix:** Compute `maxLen` dynamically from actual field name lengths, ensuring at least 1 char padding.

### 3. Duplicate arrows for self-referencing fields (FIXED)
**Command:** `stm arrows commerce_event_pb.session_id`
**Expected:** 1 arrow (`session_id -> session_id`)
**Actual (before fix):** Same arrow listed twice — "1 arrow (2 as source, 2 as target)"
**Root cause:** `buildFieldArrows` indexes each arrow under both source and target field names. When `source === target`, the same arrow object appears twice in the field's array. `findFieldArrows` didn't deduplicate.
**Fix:** Added deduplication by composite key (`mapping:source:target:line`) in `findFieldArrows`.

---

## Parser-Level Issues (Not CLI Bugs)

These are grammar gaps in `tree-sitter-stm` that affect CLI output quality. They existed before Feature 10 and are tracked separately.

### 4. Multi-word fragment spread names truncated
**Symptom:** `...sfdc address` parsed as `...sfdc` (only first word captured)
**Commands affected:** `stm where-used "sfdc address"` returns no results even though the spread exists in `sfdc_fragments.stm`
**Files:** `examples/lib/sfdc_fragments.stm:41,44`, `examples/multi-source-join.stm:119`
**Parser ticket:** This is likely tracked under the existing parser gap tickets (Feature 11).

### 5. 76 parse errors across the example corpus
**Command:** `stm validate ../../examples/`
**Result:** 79 errors, 75 warnings across 11 files
**Notable patterns:**
- Numeric literals in default values: `unexpected '0'` (db-to-db.stm:58)
- Dotted paths in transforms: `unexpected '.164'`, `unexpected '.id'` (db-to-db.stm:75-76)
- `note { }` inside mapping bodies: parsed as ERROR (db-to-db.stm:92)
- Comparison operators in transforms: `unexpected '== "SRN"'` (edi-to-json.stm)
- Arithmetic in pipes: `unexpected '| * 100'` (db-to-db.stm:145)
- `split()` function calls: `unexpected 'split('` (edi-to-json.stm:143)
- Quoted strings with commas in enums: `unexpected '"Value Prop",'` (sfdc_to_snowflake.stm:28)

These are all existing parser gaps, not CLI bugs.

---

## Commands That Work Well

| Command | Notes |
|---------|-------|
| `stm summary` | Clean overview, correct counts, good formatting |
| `stm schema <name>` | Full field detail including metadata inline |
| `stm arrows <s.f>` | Classification correct for structural/nl/mixed/none |
| `stm arrows --json` | Steps decomposed, file/line present |
| `stm fields --with-meta` | Tags (pk, required, pii) shown inline |
| `stm fields --unmapped-by` | Now correct for both source and target schemas |
| `stm nl <scope>` | Extracts transforms, warnings, notes from CST |
| `stm nl --kind <type>` | Filtering works (tested: warning, transform, note) |
| `stm meta <scope>` | Shows type, enum, default, tags for fields |
| `stm match-fields` | Normalized matching correct; sourceOnly/targetOnly accurate |
| `stm validate` | Parse errors + semantic warnings, JSON mode works |
| `stm validate --quiet` | Exit code only (2 for errors, 0 for clean) |
| `stm diff` | Added/removed schemas and mappings detected |
| `stm diff --stat` | Summary counts |
| `stm mapping` | Full arrow listing with transforms |
| `stm lineage --from/--to` | Graph traversal correct |
| `stm where-used` | Schema refs found correctly |
| `stm warnings` | Grouped by file with line numbers |
| `stm find --tag` | Cross-file tag search works |
| `stm context` | Keyword scoring and budget trimming work |

## Edge Cases Tested

- **Nonexistent schema:** Exit 1 with available schema list
- **Nonexistent field:** Exit 1 with suggestion
- **Diff same file:** "No structural differences" (correct)
- **Empty scope NL:** "No NL content found" (correct)
- **validate --quiet:** Silent with correct exit code
- **find with positional arg:** Correctly requires `--tag` flag (README says positional, should align)

---

## Minor UX Observations

1. **`stm find` argument style**: README documents `stm find <token>` with positional arg, but command requires `--tag <token>`. Not broken, but docs should match.
2. **NL truncation**: Long NL content in `stm nl` output gets `...` truncated. This is acceptable but could have a `--full` flag.
3. **`stm where-used` for fragments**: Returns "no references" for all fragments due to the parser gap with multi-word spread names. This will self-fix when the parser handles multi-word spreads.
