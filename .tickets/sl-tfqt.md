---
id: sl-tfqt
status: closed
deps: []
links: []
created: 2026-03-26T08:30:09Z
type: bug
priority: 2
assignee: Thorben Louw
---
# classify.ts: mixed classification missed when NL and structural tokens share a pipe_text node

In classify.ts (lines 28-36), the code checks kids.every((k) => NL_TYPES.has(k.type)) to decide if a pipe step is NL. When identifiers and NL strings coexist within a single pipe_text node (e.g. 'lookup some_table "Apply business rule"'), every() fails and the whole step is classified as structural. It never checks whether ANY child is NL. Result: arrows, graph, and downstream commands report [structural] instead of [mixed].

## Acceptance Criteria

1. Pipe steps with both structural and NL tokens are classified as [mixed]
2. arrows command shows [mixed] classification for such transforms
3. graph field edges show classification: mixed

