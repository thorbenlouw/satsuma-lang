---
id: sl-p0et
status: closed
deps: []
links: []
created: 2026-03-22T07:45:56Z
type: bug
priority: 2
assignee: Thorben Louw
parent: sl-dno6
tags: [cli, nl, exploratory-testing-2]
---
# nl: concatenated note strings joined without separators

When a note block contains multiple concatenated strings, they are joined without any separator (no space, no newline), causing words to run together at string boundaries.

## Reproduction

```stm
schema src { id INTEGER }
schema tgt { id INTEGER }

mapping 'order transform' {
  source { `src` }
  target { `tgt` }
  note {
    "First part of the note."
    "Second part of the note."
    "Third part with more detail."
  }
  id -> id
}
```

Run: `satsuma nl 'order transform' <file> --json`

Expected text: "First part of the note. Second part of the note. Third part with more detail."
Actual text: "First part of the note.Second part of the note.Third part with more detail."

The words run together at the boundaries (e.g., "note.Second" instead of "note. Second").

