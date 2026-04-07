---
id: sl-gl21
status: open
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

