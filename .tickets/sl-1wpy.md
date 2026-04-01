---
id: sl-1wpy
status: closed
deps: []
links: []
created: 2026-03-31T08:27:03Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lint, validate, exploratory-testing]
---
# validate/lint: lint --fix still reports fixable findings but applies zero fixes

The `lint --fix` flag identifies fixable findings (hidden-source-in-nl marked fixable: true) but applies 0 fixes. The JSON output shows `fixed: 0` even with --fix, the fixes array is empty, and the file is unchanged. This was previously reported as sl-v8qi and closed, but the bug persists.

Repro:
```bash
cat > /tmp/test-fix.stm << 'EOF'
schema fix_src { id INT (pk) }
schema fix_tgt { id INT (pk) }
schema hidden_dep { code STRING }
mapping {
  source { fix_src }
  target { fix_tgt }
  id -> id { "Look up @hidden_dep.code" }
}
EOF
satsuma lint /tmp/test-fix.stm --fix --json
# Output: findings: 1, fixable: 1, fixed: 0, fixes: []
# File unchanged
```

Expected: --fix should add hidden_dep to the mapping's source list.

## Notes

**2026-04-01**

Cause: `makeAddSourceFix` and `makeAddArrowSourceFix` searched for the mapping block by name label. For anonymous mappings (`name: null`), the `displayName` is the synthetic key `<anon>@file:row`, which never matches the named-mapping regex, so 0 fixes were applied.
Fix: Detect the `<anon>@file:row` pattern and locate the `mapping {` line by 0-indexed row number instead of by name label. Integration test added with `test/fixtures/lint-anon-fix.stm`. (commit 9f55a7b)
