---
id: sl-td9l
status: open
deps: []
links: []
created: 2026-03-21T08:02:25Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lint, exploratory-testing]
---
# lint: --fix inserts namespace-qualified source ref inside namespace block

When hidden-source-in-nl --fix adds a source inside a namespace block, it inserts the fully qualified name (e.g. crm::contacts) instead of the namespace-local name (contacts). While syntactically valid, this is inconsistent with the idiomatic style where other refs in the same namespace block use unqualified names.

Reproduction:
```bash
cp -f /tmp/satsuma-test-lint/namespace-lint.stm /tmp/satsuma-test-lint/namespace-fix-test.stm
satsuma lint /tmp/satsuma-test-lint/namespace-fix-test.stm --fix
```

Result source line: `source { \`accounts\`, crm::contacts }`
Expected: `source { \`accounts\`, \`contacts\` }`

Test fixture: /tmp/satsuma-test-lint/namespace-lint.stm

