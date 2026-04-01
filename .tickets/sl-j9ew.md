---
id: sl-j9ew
status: closed
deps: []
links: []
created: 2026-03-31T08:27:48Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lint, exploratory-testing]
---
# validate/lint: lint labels metric note @ref findings as 'mapping' scope (regression)

When lint's unresolved-nl-ref rule fires on a metric's note block, the message says 'in mapping note:metric:revenue' - incorrectly using 'mapping' as the scope label. This was previously reported as sl-fl3u and closed, but the bug persists.

Repro:
```bash
cat > /tmp/test-metric.stm << 'EOF'
schema orders { total DECIMAL }
metric revenue "Total revenue" (source orders, grain monthly) {
  total_revenue DECIMAL
  note { "Sum @nonexistent_table.amount grouped by month" }
}
EOF
satsuma lint /tmp/test-metric.stm --json
# Output: message says 'in mapping note:metric:revenue'
# Expected: 'in metric revenue' (not 'mapping')
```

## Notes

**2026-04-01**

Cause: `checkUnresolvedNlRef` in lint-engine.ts extracted the entity name from `"note:metric:revenue"` with a regex that captured `"metric:revenue"` instead of `"revenue"`, so `index.metrics.get("metric:revenue")` failed and the scope label fell back to `"mapping"`.
Fix: Use `stripNLRefScopePrefix` (from `satsuma-core`) to strip all known prefix forms and get the bare entity name for lookups and display.
