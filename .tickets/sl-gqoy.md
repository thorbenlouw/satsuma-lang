---
id: sl-gqoy
status: closed
deps: []
links: []
created: 2026-03-26T08:30:30Z
type: bug
priority: 3
assignee: Thorben Louw
---
# mapping --compact --json: still includes transforms and notes in JSON output

The --compact flag correctly omits transform bodies and notes in text output mode, but JSON output still includes 'transform' and 'metadata' fields on arrows. Expected: JSON --compact should also strip transform text and note metadata for consistency with text mode.

## Acceptance Criteria

1. satsuma mapping name --compact --json omits transform text from arrows
2. satsuma mapping name --compact --json omits note metadata from arrows
3. Text and JSON compact modes produce equivalent levels of detail

