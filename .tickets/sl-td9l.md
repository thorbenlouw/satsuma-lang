---
id: sl-td9l
status: closed
deps: []
links: [sl-niix]
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


## Notes

**2026-03-22T01:04:48Z**

Fixed makeAddSourceFix to strip namespace prefix when inserting source refs inside same namespace block. Also fixed description message. Added integration test. All 590 tests pass.
