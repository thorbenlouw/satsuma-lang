---
id: stm-8l0v
status: closed
deps: [stm-iohm]
links: []
created: 2026-03-18T16:52:43Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u32p
tags: [cli, feature-10]
---
# Implement stm validate command

New command: stm validate. Reports parse errors (from tree-sitter ERROR/MISSING nodes) and semantic warnings (broken references, duplicates, field mismatches). The one end-to-end command — structural correctness is fully deterministic.

## Acceptance Criteria

- [ ] Create src/validate.js with structural checks (CST ERROR/MISSING nodes) and semantic checks
- [ ] Semantic checks: undefined schema refs in mappings, undefined fragment/transform spreads, duplicate names, arrow fields not in declared schema, undefined metric sources
- [ ] Default output: file:line:col severity message, grouped by file
- [ ] Summary line: N errors, N warnings in N files
- [ ] --json: array of { file, line, column, severity, rule, message }
- [ ] --errors-only suppresses warnings
- [ ] --quiet: exit code only (0 = clean, 2 = errors)
- [ ] Tests: valid workspace produces 0 errors
- [ ] Tests: parse errors report correct line/column
- [ ] Tests: undefined schema ref produces warning
- [ ] Tests: duplicate name produces warning
- [ ] Tests: --quiet returns correct exit code
- [ ] Tests: --json produces valid JSON

