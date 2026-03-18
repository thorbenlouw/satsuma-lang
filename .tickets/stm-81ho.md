---
id: stm-81ho
status: closed
deps: [stm-j7fc, stm-fwo4, stm-j4ch, stm-daev, stm-xnbx, stm-8l0v, stm-7i0q]
links: []
created: 2026-03-18T16:52:43Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u32p
tags: [cli, feature-10, test]
---
# Integration tests for CLI structural primitives

End-to-end integration tests for all Feature 10 commands using examples/ and the Data Vault example as fixtures.

## Acceptance Criteria

- [ ] stm arrows returns correct arrows with correct classification for fields across example corpus
- [ ] stm nl extracts all NL content for schemas and mappings in examples
- [ ] stm meta extracts correct metadata for schemas and fields
- [ ] stm fields --unmapped-by returns correct set difference
- [ ] stm match-fields returns correct normalized matches between example schemas
- [ ] stm validate on clean workspace exits 0
- [ ] stm validate on workspace with injected errors reports correct diagnostics
- [ ] stm diff between original and modified fixture shows expected delta
- [ ] All commands produce valid JSON with --json
- [ ] Exit codes are correct for success, not-found, and error cases

