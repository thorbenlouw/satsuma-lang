---
id: stm-14x.5
status: closed
deps: [stm-14x.4]
links: []
created: 2026-03-13T13:46:54Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-14x
---
# Implement paths, expressions, and multiline transform continuations

Add dotted and relative paths, array segments, backtick path segments, literal and function-call transforms, pipe chains, `when`/`else` branches, `fallback` clauses, minimal conditions, and map literal expressions needed by STM examples and spec text.

## Acceptance Criteria
- Paths support dotted, relative, array-segment, and backtick-segment forms with CST nodes that preserve segment boundaries and array markers.
- Transform syntax supports inline heads after `:`, pipeline continuation lines beginning with `|`, `when`/`else` branches, and `fallback` continuations.
- Minimal expression parsing covers literals, function-call arguments, comparison operators used in conditions, `in (...)`, booleans, `null`, and value-map literals like `map { A: "a", _: "fallback" }`.
- Recovery tests cover partial transform lines, incomplete paths after `->`, and malformed condition/continuation lines.
- Corpus coverage includes one-line and multiline equivalents to guard newline-sensitive regressions.


## Acceptance Criteria

- Paths support dotted, relative, array-segment, and backtick-segment forms with CST nodes that preserve segment boundaries and array markers.
- Transform syntax supports inline heads after `:`, pipeline continuation lines beginning with `|`, `when`/`else` branches, and `fallback` continuations.
- Minimal expression parsing covers literals, function-call arguments, comparison operators used in conditions, `in (...)`, booleans, `null`, and value-map literals like `map { A: "a", _: "fallback" }`.
- Recovery tests cover partial transform lines, incomplete paths after `->`, and malformed condition/continuation lines.
- Corpus coverage includes one-line and multiline equivalents to guard newline-sensitive regressions.


