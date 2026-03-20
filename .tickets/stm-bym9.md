---
id: stm-bym9
status: closed
deps: []
links: [stm-7rz4]
created: 2026-03-19T07:17:33Z
type: bug
priority: 3
assignee: Thorben Louw
tags: [validator, feature-13]
---
# Suppress undefined-ref for names in import statements during single-file validation

Single-file validation does not follow import paths, producing false undefined-ref warnings for cross-file references. Workspace validation resolves these correctly. 5 warnings in mart-sales.stm.

## Acceptance Criteria

stm validate on a single file with imports does not produce undefined-ref warnings for names that appear in import statements.


## Notes

**2026-03-20T11:52:58Z**

Closed as duplicate of stm-8k6p. Import resolution in the workspace loader will make imported names visible to the validator, eliminating the false undefined-ref warnings.
