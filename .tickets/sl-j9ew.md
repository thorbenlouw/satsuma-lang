---
id: sl-j9ew
status: open
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

