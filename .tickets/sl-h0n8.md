---
id: sl-h0n8
status: closed
deps: [sl-dthn]
links: [sl-dthn]
created: 2026-03-24T08:14:29Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lint]
---
# Lint unresolved-nl-ref false positive for metric's own field names in note blocks

When a metric's note block references its own fields via backtick (e.g. \`fill_ratio\`, \`avg_fill_time_ms\`), the `unresolved-nl-ref` lint rule flags them as unresolved. These ARE fields of the containing metric and should resolve.

Repro from `satsuma lint bug-hunt/ --json`:
```
NL reference \`fill_ratio\` in ... 'note:fill_rate' does not resolve to any known identifier
NL reference \`avg_fill_time_ms\` in ... 'note:fill_rate' does not resolve to any known identifier
```

But `fill_ratio` and `avg_fill_time_ms` ARE fields defined in the `fill_rate` metric.

Similarly, \`OBR.OrderDateTime\` and \`OBR.ResultDateTime\` in `lab_turnaround` metric note — these are fields of the metric's source schema (related to the dotted-path resolution bug sl-dthn).

## Acceptance Criteria

1. Backtick refs in metric notes that match the metric's own field names are not flagged
2. Backtick refs in metric notes that match fields in the metric's source schema(s) are not flagged
3. Genuinely unresolved refs in metric notes are still flagged


## Notes

**2026-03-24T09:05:00Z**

Cause: Metric note blocks had empty mapping context — metric's own fields and source schemas were not checked.
Fix: When mapping key starts with 'note:', check if the block is a metric and add its fields and sources to the context. Bare field refs matching metric fields are skipped. (commit pending)
