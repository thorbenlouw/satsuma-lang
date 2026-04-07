---
id: sl-gl21
status: closed
deps: []
links: []
created: 2026-04-02T15:15:27Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [core, validator, nl-ref]
---
# NL @ref regex produces false positives on email-like patterns

The AT_REF_RE regex in satsuma-core/src/nl-ref.ts:110 matches @ symbols in email-like patterns (e.g. %@test.internal, user@example.com), producing spurious unresolved-nl-ref warnings.

Repro: examples/multi-source/multi-source-join.stm line 24 contains `email LIKE %@test.internal` inside a note. The validator flags `@test.internal` as an unresolved NL reference.

Root cause: the regex /@(`[^`]+`|[a-zA-Z_][a-zA-Z0-9_-]*).../ has no negative lookbehind for non-whitespace characters preceding the @. Any @ followed by a valid identifier is matched regardless of context.

Needs a design decision: should the fix be a regex-level lookbehind (e.g. require whitespace or start-of-string before @), or should certain NL contexts (filter strings, SQL patterns) suppress ref resolution entirely?

## Acceptance Criteria

- validate on examples/multi-source/multi-source-join.stm produces zero warnings
- @refs preceded by non-whitespace (e.g. %@foo, user@bar.com) are not extracted
- @refs at start of string, after whitespace, or after punctuation like ( are still extracted
- Existing NL ref tests continue to pass


## Notes

**2026-04-07T15:21:41Z**

**2026-04-07T15:21:41Z**

Cause: AT_REF_RE had no lookbehind, so any '@' followed by an identifier matched — including email addresses (user@example.com) and SQL LIKE wildcards (%@test.internal), producing spurious unresolved-nl-ref warnings.
Fix: Added a lookbehind that only allows '@' at start-of-string, after whitespace, or after a small set of opening/separator punctuation '([{,;'. The pattern is now exported from satsuma-core as AT_REF_PATTERN with a createAtRefRegex() factory; LSP (definition.ts, semantic-tokens.ts), satsuma-viz (markdown.ts), and satsuma-viz-backend (workspace-index.ts) all import it instead of duplicating the regex. New unit tests in core/test/nl-ref.test.js cover email/wildcard/digit/underscore prefixes plus the start-of-string and opening-punctuation acceptance cases. Validating examples/multi-source/multi-source-join.stm now reports zero warnings.
