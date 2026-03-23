---
id: sl-g1fj
status: closed
deps: []
links: [sl-hyxz, sl-dyqb]
created: 2026-03-23T09:55:03Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [feature-13, parser]
---
# Parser: triple-quoted strings cannot contain double-quote characters

## Acceptance Criteria

Triple-quoted strings containing inner double-quote characters parse without ERROR nodes. Corpus tests added for edge cases. All data-modelling examples parse clean.


## Notes

**2026-03-23T10:00:02Z**

Already fixed. Grammar regex handles inner double quotes. Corpus tests exist in lexical.txt.
