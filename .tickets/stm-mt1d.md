---
id: stm-mt1d
status: closed
deps: [stm-58nl, stm-w0qt]
links: []
created: 2026-03-19T19:50:41Z
type: feature
priority: 1
assignee: Thorben Louw
tags: [stm-cli, lint, autofix, tooling]
---
# Add stm lint command with safe autofix support

Introduce a dedicated `stm lint` command for STM workspaces.

`stm validate` already covers parse errors and semantic reference checks, but it is not a true linter: it does not clearly separate correctness validation from lint policy, it does not provide fixable diagnostics, and warnings do not fail the command by default. Projects that embed STM need a command they can use in local development, pre-commit hooks, and CI to enforce workspace hygiene and modeling conventions in a predictable way.

The new command should lint one file or a workspace directory, emit structured diagnostics, distinguish fixable vs non-fixable findings, and support `--fix` for rules that can be corrected mechanically without changing STM meaning.

## Design

Design goals:
- Keep `stm validate` focused on parser/semantic correctness and add `stm lint` as the policy-oriented command.
- Reuse existing parse/index infrastructure so lint remains parser-backed and workspace-aware.
- Make every lint rule explicit, named, and individually testable.
- Support machine-readable output for editor/CI integrations.
- Only autofix changes that are deterministic and semantics-preserving.

Recommended command surface:
- `stm lint [path]`
- `stm lint [path] --json`
- `stm lint [path] --fix`
- `stm lint [path] --fix --json`
- optional follow-up flags if useful: `--rules`, `--select`, `--ignore`, `--fix-only`, `--check`

Recommended behavior:
- Exit non-zero when lint findings are present, even if they are warnings-level policy issues.
- Emit diagnostics with file, line, column, rule id, severity, message, and `fixable` boolean.
- When `--fix` is used, apply all safe fixes, report what changed, and leave non-fixable findings in the output.
- If a fix cannot be applied cleanly, report that explicitly rather than partially corrupting the file.

Initial rule set should include at least:
- hidden-source-in-nl: mapping NL references a schema not declared in `source {}`/`target {}`
- unresolved-nl-ref: backticked NL reference does not resolve
- duplicate-definition reuse via existing validator logic if appropriate for lint surfacing
- optional style/policy rules that are deterministic and useful in real projects, such as placeholder-reference-in-nl or ambiguous placeholder text patterns

Autofix scope should be conservative. Good candidates:
- add missing schema refs to `source {}` when the NL reference is namespace-qualified and unambiguous
- normalize obvious stale placeholder refs in examples/tests only if backed by a concrete rule
- formatting-adjacent fixes only if a stable formatter or printer exists; otherwise do not invent formatting rewrites

Non-goals for the first version:
- free-form NL interpretation
- risky rewrites that infer business semantics
- a broad style formatter disguised as a linter
- fixing parse errors by guessing user intent

Implementation notes:
- Add a dedicated lint engine/module rather than overloading validate output formatting.
- Share diagnostic/rule plumbing between validate and lint where sensible, but keep command semantics separate.
- Document which rules belong to validate vs lint and why.
- Add fixture coverage for fixable and non-fixable cases.
- Ensure `--fix` is idempotent: running it twice should yield no further changes.

## Acceptance Criteria

Acceptance criteria:
1. `stm lint [path]` exists and works on both a single `.stm` file and a workspace directory.
2. The command emits parser-backed diagnostics with rule id, severity, file, line, column, message, and whether the finding is fixable.
3. `stm lint --json` returns a stable machine-readable format suitable for CI/editor integration.
4. The command exits non-zero when lint findings are present; exit semantics are documented.
5. `stm lint --fix` applies all safe, deterministic fixes and reports how many files/findings were changed.
6. `stm lint --fix` never performs speculative semantic rewrites; non-fixable findings remain as diagnostics.
7. Hidden schema dependencies referenced from NL transforms/comments can be surfaced as lint findings, and at least the unambiguous namespace-qualified case is fixable by updating `source {}`.
8. Running `stm lint --fix` twice is idempotent.
9. Command behavior is covered by automated tests, including: clean workspace, lint failures, JSON output, fix mode, idempotent fix mode, and mixed fixable/non-fixable findings.
10. Relevant CLI docs are updated to explain when to use `stm validate` vs `stm lint`.
11. Example corpus and/or fixtures are added or updated to demonstrate at least one real fixable lint rule.
12. Existing `stm validate` behavior remains intact unless explicitly documented as part of the lint split.

