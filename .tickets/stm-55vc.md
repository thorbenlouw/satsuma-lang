---
id: stm-55vc
status: open
deps: [stm-o50b]
links: []
created: 2026-03-16T13:46:39Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-t1n8
---
# Implement baseline TextMate grammar for STM declarations and literals

Implement the first usable STM TextMate grammar covering top-level declarations, literals, identifiers, comments, operators, tags, annotations, and multiline note blocks with theme-compatible scopes.

## Acceptance Criteria

The TextMate grammar scopes STM top-level declarations including import, integration, schema-family blocks, fragment, and map.
Strings, numbers, comments, key operators, tags, annotations, and multiline note blocks receive stable standard scopes.
The grammar handles soft keywords conservatively enough to avoid obvious identifier mis-highlighting.
Fixture coverage exists for the baseline constructs and expected scopes are asserted non-interactively.
The grammar remains readable and maintainable rather than relying on brittle deeply nested regexes.

