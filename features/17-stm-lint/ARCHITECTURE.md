# satsuma lint — Architecture and Diagnostic Contract

This document defines the implementation contract for `satsuma lint` before command
and rule work begins. It captures the separation between validate and lint,
the diagnostic schema, exit-code semantics, fix mechanics, and rule registration.

## Command Separation: validate vs lint

| Concern | `satsuma validate` | `satsuma lint` |
|---------|----------------|------------|
| Purpose | Parser/semantic **correctness** | **Policy** and workspace hygiene |
| Parse errors | Yes (CST ERROR/MISSING nodes) | No — delegate to validate |
| Semantic refs | Yes (undefined-ref, field-not-in-schema, etc.) | No — delegate to validate |
| NL reference checks | Yes (nl-ref-unresolved, nl-ref-not-in-source) | Yes — surfaced as lint rules |
| Duplicate definitions | Yes (duplicate-definition) | No — already a validate error |
| Style/convention rules | No | Yes |
| Fixable diagnostics | No | Yes |
| Exit on warnings | No (exit 0 unless errors) | Yes (exit non-zero on any finding) |

**Guiding principle:** `satsuma validate` answers "is this valid Satsuma?".
`satsuma lint` answers "does this Satsuma meet project quality standards?".
Some checks (NL reference quality) are relevant to both; lint resurfaces them
with fixability metadata rather than duplicating the detection logic.

## Diagnostic Schema

Every lint finding is a `LintDiagnostic`:

```typescript
interface LintDiagnostic {
  file: string;       // relative file path
  line: number;       // 1-based
  column: number;     // 1-based
  severity: "error" | "warning";
  rule: string;       // kebab-case rule id, e.g. "hidden-source-in-nl"
  message: string;    // human-readable explanation
  fixable: boolean;   // true if --fix can resolve this finding
}
```

This extends the existing `Diagnostic` typedef in `validate.js` with the
`fixable` field. The validate diagnostic shape is unchanged.

### JSON Output (--json)

```json
{
  "findings": [ /* LintDiagnostic[] */ ],
  "fixes": [],
  "summary": {
    "files": 3,
    "findings": 5,
    "fixable": 2,
    "fixed": 0
  }
}
```

When `--fix` is used, `fixes` contains applied fix records:

```json
{
  "findings": [ /* remaining non-fixable findings */ ],
  "fixes": [
    {
      "file": "pipeline.stm",
      "rule": "hidden-source-in-nl",
      "description": "Added 'crm::orders' to source list"
    }
  ],
  "summary": {
    "files": 3,
    "findings": 3,
    "fixable": 0,
    "fixed": 2
  }
}
```

### Text Output (default)

```
pipeline.stm:14:5 warning [hidden-source-in-nl] NL reference `crm::orders` not in source list (fixable)
pipeline.stm:28:3 warning [unresolved-nl-ref] NL reference `stale_name` does not resolve

2 warnings in 3 files (1 fixable)
```

With `--fix`:

```
Fixed: pipeline.stm [hidden-source-in-nl] Added 'crm::orders' to source list

pipeline.stm:28:3 warning [unresolved-nl-ref] NL reference `stale_name` does not resolve

1 fixed, 1 warning remaining in 3 files
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | No findings (or all findings fixed with `--fix`) |
| 1 | Internal error (filesystem, parser crash, bad arguments) |
| 2 | Lint findings present |

Key difference from `satsuma validate`: validate exits 0 on warnings-only.
`satsuma lint` exits 2 on any finding, regardless of severity. This makes lint
suitable for CI gates and pre-commit hooks where any policy violation should
block.

After `--fix`: exit 0 if all findings were fixed, exit 2 if non-fixable
findings remain.

## Rule Registration Model

Rules are functions that receive the workspace index and return diagnostics.
Each rule is a named module-level function in the lint engine.

```javascript
/**
 * @typedef {Object} LintRule
 * @property {string} id          kebab-case rule identifier
 * @property {string} description one-line description for --rules listing
 * @property {(index: WorkspaceIndex) => LintDiagnostic[]} check
 */
```

Rules are registered in a static array in the lint engine. There is no dynamic
plugin system in v1. Adding a rule means adding a function and an entry in the
rules array.

```javascript
const RULES = [
  { id: "hidden-source-in-nl", description: "NL references schema not in source/target list", check: checkHiddenSourceInNl },
  { id: "unresolved-nl-ref",   description: "NL backtick reference does not resolve",          check: checkUnresolvedNlRef },
];
```

### Rule Filtering

- `--select rule1,rule2` — run only the listed rules
- `--ignore rule1,rule2` — skip the listed rules

These are optional v1 flags; the command works without them (all rules run).

## Fixable Rules and the --fix Contract

### Safety Bar

A rule may declare findings as `fixable: true` only when:

1. **Deterministic:** the fix produces the same result regardless of execution
   order or environment.
2. **Semantics-preserving:** the fix does not change the meaning of any mapping,
   schema, or transform.
3. **Idempotent:** applying the fix to already-fixed content produces no further
   changes.
4. **Atomic per file:** the fix either succeeds completely for a file or applies
   no changes to that file.

### Fix Mechanics

Each fixable rule returns a `fix` descriptor alongside its diagnostic:

```javascript
/**
 * @typedef {Object} LintFix
 * @property {string} file          file to modify
 * @property {string} rule          rule that produced this fix
 * @property {string} description   human-readable summary of the change
 * @property {(source: string) => string} apply
 *     Takes the full file source text and returns the modified source text.
 *     Must be pure — no side effects, no filesystem access.
 */
```

The lint engine:
1. Collects all diagnostics from all rules.
2. If `--fix` is not set, reports findings and exits.
3. If `--fix` is set, groups fixes by file.
4. For each file with fixes: reads source, applies fixes sequentially (ordered
   by line descending to preserve positions), writes back.
5. Re-runs lint on modified files to verify idempotence and catch any fix
   interactions. If new findings appear after fix, reports them as warnings
   rather than silently dropping them.

### Initial Fixable Rules

| Rule | Fix |
|------|-----|
| `hidden-source-in-nl` | Add namespace-qualified schema name to the mapping's `source {}` block. Only fixable when the NL reference is namespace-qualified (unambiguous). |

Conservative scope — more fixable rules can be added as the formatter/printer
stabilizes.

## Pipeline Integration

The lint command reuses the existing parse → extract → index pipeline:

```
resolveInput(path)
  → parseFile() for each file
  → extractFileData() while tree is valid
  → buildIndex(extracted)
  → run lint rules against index
  → optionally apply fixes
```

This is the same pipeline as `satsuma validate`. The lint command imports the same
`resolveInput`, `parseFile`, `extractFileData`, and `buildIndex` functions.

Lint rules receive the full `WorkspaceIndex` and can access schemas, mappings,
fragments, metrics, nlRefData, fieldArrows, and duplicates.

## File Layout

```
tooling/satsuma-cli/src/
  lint-engine.js         # rule registry, runner, fix applier
  commands/lint.js       # CLI command handler (commander registration)
test/
  lint-engine.test.js    # unit tests for individual rules
  integration tests      # end-to-end CLI tests in existing integration suite
```

## Non-Goals for v1

- Dynamic rule plugins or configuration files
- Free-form NL interpretation
- Formatting/whitespace enforcement
- Fixing parse errors
- Cross-file fix coordination (each file fixed independently)
