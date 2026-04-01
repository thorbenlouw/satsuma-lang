---
id: sl-tslm
status: closed
deps: []
links: []
created: 2026-03-31T08:30:59Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, namespace, import, exploratory-testing]
---
# namespace/import: validate and lint use different rule names for same NL ref check

The same unresolved NL reference check uses different rule names:
- `validate` reports rule `nl-ref-unresolved`
- `lint` reports rule `unresolved-nl-ref`

The CLI docs (SATSUMA-CLI.md) list the lint rule as `unresolved-nl-ref`. This inconsistency makes it harder for consumers to filter or map findings from both commands.

Repro:
  cd /tmp/satsuma-test-ns-import/validate-edge
  satsuma validate . --json   # rule: 'nl-ref-unresolved'
  satsuma lint . --json       # rule: 'unresolved-nl-ref'

## Notes

**2026-04-01**

Cause: `checkNLRefs` in `satsuma-core/src/validate.ts` used the rule name `"nl-ref-unresolved"` while `checkUnresolvedNlRef` in `lint-engine.ts` correctly used `"unresolved-nl-ref"` (matching CLI docs). Simple string mismatch.
Fix: Renamed the rule in validate.ts to `"unresolved-nl-ref"`. Both paths now emit the same rule name, enabling consumers to deduplicate by `(rule, file, line, column)`. (commit 9f55a7b)
