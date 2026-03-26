---
id: sl-2ayt
status: closed
deps: []
links: []
created: 2026-03-26T08:30:34Z
type: bug
priority: 3
assignee: Thorben Louw
---
# mapping vs arrows: inconsistent classification for empty transform body { }

An arrow 'a -> x { }' with empty braces is classified as kind:'nested' by the mapping command but classification:'none' by the arrows command. The arrows command is correct — an empty body is not a nested block. The mapping command should classify it consistently.

## Acceptance Criteria

1. mapping --json classifies a -> x { } consistently with arrows command
2. Empty braces are not treated as nested blocks

