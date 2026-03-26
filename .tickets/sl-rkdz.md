---
id: sl-rkdz
status: closed
deps: []
links: [sl-vrsu]
created: 2026-03-26T08:30:46Z
type: bug
priority: 2
assignee: Thorben Louw
---
# lint hidden-source-in-nl: false positive for dotted sub-field paths of declared source records

When an NL transform references a dotted sub-field path like PERSONAL_NAME.FIRST_NAME where PERSONAL_NAME is a declared record field in the source schema, the hidden-source-in-nl rule flags it as an error. The rule should recognize that dotted paths whose root segment is a declared source/target field are not hidden sources. Reproduces with cobol-to-avro.stm.

## Acceptance Criteria

1. lint does not flag dotted sub-field paths when the root segment is in source/target
2. lint still correctly flags truly hidden sources (root segment not in source/target)

