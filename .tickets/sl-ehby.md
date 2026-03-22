---
id: sl-ehby
status: open
deps: []
links: []
created: 2026-03-20T18:41:38Z
type: bug
priority: 3
assignee: Thorben Louw
tags: [cli, docs, bug]
---
# SATSUMA-CLI.md still documents nl/meta two-token field scope that does not work

Ticket sg-95gr was marked done but SATSUMA-CLI.md still shows examples like 'satsuma nl mapping demographics to mart' and 'satsuma nl schema loyalty_sfdc'. The implemented CLI only accepts a single <scope> token (the bare name), so 'satsuma nl schema legacy_sqlserver examples/' treats 'legacy_sqlserver' as the path and fails with ENOENT. The documented agent workflow examples (impact analysis, PII audit, coverage assessment) all use the broken two-token form.

## Acceptance Criteria

1. All nl and meta examples in SATSUMA-CLI.md match the actual CLI contract.
2. Documented workflow examples use the correct invocation form.
3. AI-AGENT-REFERENCE.md examples are also consistent.

