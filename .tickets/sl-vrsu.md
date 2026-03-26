---
id: sl-vrsu
status: open
deps: []
links: [sl-rkdz]
created: 2026-03-26T08:30:51Z
type: bug
priority: 3
assignee: Thorben Louw
---
# lint unresolved-nl-ref: false positives for backtick emphasis in file-level notes

File-level note blocks use backtick-quoted terms for emphasis/code formatting (e.g. `flatten`, `pii`, `owner`), not as field references. The unresolved-nl-ref rule treats all backtick-quoted text in notes as NL refs and flags them. This produces 36 false positive warnings across the example corpus. The rule should either: skip file-level notes entirely, or use a heuristic to distinguish emphasis from refs (e.g. known keywords, single-word terms).

## Acceptance Criteria

1. lint does not flag backtick-quoted terms used for emphasis in file-level notes
2. lint still correctly flags genuine unresolved backtick refs in mapping transforms

