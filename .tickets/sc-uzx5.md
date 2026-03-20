---
id: sc-uzx5
status: closed
deps: []
links: []
created: 2026-03-20T16:04:43Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, where-used]
---
# where-used fails to match quoted fragment spread labels

In where-used.js, findFragmentSpreads compares the raw spread_label node text (e.g. "'audit fields'" with quotes) against the resolved fragment name from the index (e.g. "audit fields" without quotes, since extractFragments uses labelText which strips quotes). This means `satsuma where-used 'audit fields'` will never find spread usages like `...'audit fields'` because the comparison fails due to the quote mismatch.

## Acceptance Criteria

1. `satsuma where-used 'audit fields'` correctly finds schemas that spread `...'audit fields'`
2. A test covers quoted fragment spread matching in where-used

