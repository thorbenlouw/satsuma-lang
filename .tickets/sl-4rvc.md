---
id: sl-4rvc
status: open
deps: []
links: []
created: 2026-03-31T08:27:31Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lint, validate, exploratory-testing]
---
# validate/lint: duplicate diagnostics when running both validate and lint

Running both `satsuma validate` and `satsuma lint` (the recommended workflow per AI-AGENT-REFERENCE.md steps 14-15) produces duplicate diagnostics for two rule categories:

1. `duplicate-definition` - reported by BOTH validate and lint with identical messages
2. Unresolved NL refs - reported as `nl-ref-unresolved` by validate AND `unresolved-nl-ref` by lint (different rule names, same finding)

The CLI docs say validate checks 'structural correctness' and lint checks 'policy and conventions'. The duplicate-definition rule belongs in one command, not both. Similarly, NL ref checking is documented as a lint rule but validate also runs it.

This causes confusion when tooling or agents run both commands sequentially - they get 2x the diagnostics. The rule names differ for NL refs (nl-ref-unresolved vs unresolved-nl-ref) which makes deduplication harder.

