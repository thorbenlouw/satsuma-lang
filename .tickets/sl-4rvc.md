---
id: sl-4rvc
status: closed
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

## Notes

**2026-04-01**

Cause: `validate` ran its own NL ref check (rule `"nl-ref-unresolved"`) in addition to `lint` running `checkUnresolvedNlRef` (rule `"unresolved-nl-ref"`). The `duplicate-definition` check also ran in both.
Fix (partial): sl-tslm unifies the rule name to `"unresolved-nl-ref"` in both commands, enabling consumers to deduplicate by `(rule, file, line, column)`. The underlying question of whether validate should run NL ref checks at all is a design decision deferred to a future ADR. The duplicate-definition check remains in both commands intentionally (validate needs it for correctness; lint surfaces it for workflow convenience).
