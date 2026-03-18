---
id: stm-58ae
status: open
deps: []
links: []
created: 2026-03-18T18:56:38Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-q2cz
tags: [parser, tree-sitter, enum, fragments]
---
# Support quoted enum members and multi-word spreads

Allow enum entries such as "Value Prop" and spread labels such as ...audit fields and ...clean email.

## Acceptance Criteria

Corpus tests cover quoted enum members, fragment spreads with multi-word labels, and transform spreads with multi-word labels.
The grammar parses examples/sfdc_to_snowflake.stm, examples/lib/sfdc_fragments.stm, and examples/multi-source-join.stm without errors from those constructs.

