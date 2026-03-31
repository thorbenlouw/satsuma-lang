---
id: sl-tslm
status: open
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

