---
id: stm-to29
status: open
deps: []
links: [stm-jruy, stm-2szj, stm-eg9u, stm-5pi1, stm-pzwn, stm-d281]
created: 2026-03-16T15:45:55Z
type: task
priority: 2
assignee: Thorben Louw
tags: [rename-mapping-keyword]
---
# Update tree-sitter highlights.scm, test scripts, and README for mapping keyword

Add mapping to the keyword list in highlights.scm (alongside existing map for value-map literal). Update test_cst_summary.py inline fixture to use mapping keyword. Update tooling/tree-sitter-stm/README.md prose.

## Acceptance Criteria

highlights.scm lists mapping as a keyword. test_cst_summary.py fixture uses mapping keyword and test passes. README.md references updated.

