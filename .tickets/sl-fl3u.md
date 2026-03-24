---
id: sl-fl3u
status: closed
deps: []
links: [sl-h0n8]
created: 2026-03-24T08:14:17Z
type: bug
priority: 3
assignee: Thorben Louw
tags: [cli, lint]
---
# Lint labels metric notes as 'mapping' scope

When lint processes NL backtick references in metric note blocks, the scope label says `mapping 'note:metric_name'` instead of correctly labeling it as a metric.

Example from `satsuma lint bug-hunt/ --json`:
```json
{"message": "NL reference \`fill_ratio\` in mapping 'note:fill_rate' does not resolve..."}
{"message": "NL reference \`OBR.OrderDateTime\` in mapping 'note:lab_turnaround' does not resolve..."}
```

'fill_rate' and 'lab_turnaround' are metrics, not mappings. The scope label should reflect this.

## Acceptance Criteria

1. Lint messages for metric note blocks use 'metric' not 'mapping' as the scope label
2. Both text and JSON output show correct scope type


## Notes

**2026-03-24T09:05:00Z**

Cause: extractBlockNoteRefs used 'note:X' as the mapping label for all block types — the lint engine always displayed 'mapping' as the scope.
Fix: Added scope detection in checkUnresolvedNlRef — note blocks inside metrics now show 'metric', schemas show 'schema'. (commit pending)
