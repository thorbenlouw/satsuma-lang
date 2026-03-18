---
id: stm-xnbx
status: open
deps: []
links: []
created: 2026-03-18T16:52:43Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u32p
tags: [cli, feature-10]
---
# Implement stm match-fields command

New command: stm match-fields --source <schema> --target <schema>. Deterministic normalized name comparison (lowercase, strip _ and -). Exact match after normalization — no fuzzy scoring, no thresholds.

## Acceptance Criteria

- [ ] Create src/normalize.js: normalizeName (lowercase, strip _ and -), matchFields function
- [ ] Match is exact string equality after normalization — binary, no scoring
- [ ] Output: matched pairs with normalized form, source-only list, target-only list
- [ ] --matched-only shows only matches
- [ ] --unmatched-only shows only unmatched fields from both sides
- [ ] --json structured output
- [ ] Exit 1 if source or target schema not found
- [ ] Tests: FirstName matches first_name (both normalize to firstname)
- [ ] Tests: MailingCity does NOT match city (different normalized forms)
- [ ] Tests: source-only and target-only lists are correct

