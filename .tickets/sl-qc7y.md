---
id: sl-qc7y
status: closed
deps: []
links: []
created: 2026-03-24T08:14:52Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [parser, grammar]
---
# Numeric values in enum declarations cause parse error

Bare numeric values in enum declarations cause parse errors. This is common in enterprise schemas where code values are numeric (FIX protocol sides: 1=Buy, 2=Sell; HL7 segment qualifiers; COBOL code fields).

Repro:
```stm
// This fails:
Side STRING(1) (enum {1, 2, 5, 6})
// Error: Syntax error: unexpected 'enum {1, 2, 5, 6},'

// Workaround — quoting:
Side STRING(1) (enum {"1", "2", "5", "6"})
```

Also fails for special characters: `enum {<, <=, >=, >}`

The grammar's `enum_items` rule likely only accepts identifiers and quoted strings, not numeric literals or operator symbols.

## Acceptance Criteria

1. Numeric values in enum declarations parse successfully: `enum {1, 2, 3}`
2. Negative numbers work: `enum {-1, 0, 1}`
3. Special characters should either be supported or produce a clear error message suggesting quoting
4. Tree-sitter corpus test added for numeric enum values

## Notes

**2026-03-24T08:45:00Z**

Cause: The `enum_body` rule in `grammar.js` only accepted `choice($.identifier, $.nl_string)` as enum item types, rejecting numeric literals.
Fix: Added `$.number_literal` to the `enum_body` choice. Added two corpus tests: pure numeric enums and mixed enum values. Negative numbers already work via quoting; special characters like `<` should be quoted. (commit pending)

