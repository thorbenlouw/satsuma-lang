---
id: sl-04pv
status: done
deps: []
links: [sl-80jy]
created: 2026-03-20T18:41:21Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lint, bug]
---
# hidden-source-in-nl lint rule never fires

The 'hidden-source-in-nl' lint rule (documented as fixable) never triggers. Test case: a mapping with source {`src`} referencing `hidden` (a schema defined in the same file but not in the source list) in NL text passes lint with no findings. Instead, when using the dotted form `hidden.code`, the unresolved-nl-ref rule fires incorrectly (false positive — both schema and field exist). Steps to reproduce: create a file with schemas src, hidden, tgt; create a mapping sourcing src targeting tgt with NL referencing `hidden`; run satsuma lint.

## Acceptance Criteria

1. A mapping NL body referencing a schema not in its source/target list triggers hidden-source-in-nl.
2. The dotted form (e.g., `hidden.code`) where both schema and field exist does NOT trigger unresolved-nl-ref.

