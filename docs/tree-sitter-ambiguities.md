# STM Tree-Sitter Ambiguities

## Goal

This document records the grammar boundaries that must be locked before STM
parser implementation expands. Each ambiguity listed here should receive
targeted corpus coverage once the relevant grammar rules exist.

## High-Risk Ambiguities

### `map` block versus transform value-map literal

Examples:

```stm
map source_a -> target_b {
  a -> b
}

src -> tgt : map { A: "a", _: "fallback" }
```

Risk:

- both forms begin with the `map` keyword followed by `{`
- one is a top-level declaration, the other is an expression in a transform

Resolution direction:

- reserve block-level `map` parsing to declaration positions
- inside transform context, parse `map { ... }` as a value-map literal

### Nested map block versus mapping-entry note block

Examples:

```stm
items[] -> rows[] {
  .sku -> .sku
}

src -> tgt {
  note '''
    explanation
  '''
}
```

Risk:

- both use braces after a mapping head
- one contains nested mappings, the other contains documentation

Resolution direction:

- disambiguate based on first meaningful token inside the braces
- `note`-only payloads should parse as mapping-entry note blocks

### `when` in map header options versus transform continuation

Examples:

```stm
map source -> target [when: status == "ACTIVE"] {
  a -> b
}

src -> tgt
  : when status == "ACTIVE" => "ok"
```

Risk:

- `when` appears in two different structural roles
- newline sensitivity can blur the distinction

Resolution direction:

- header options only exist inside the map header option list
- continuation `when` clauses only exist after a transform head begins

### Relative dotted paths versus dotted identifiers

Examples:

```stm
.customer.id
`line.item.no`
```

Risk:

- `.` may begin a relative path or be part of a quoted field name
- a dotted unquoted sequence must never collapse into a single identifier

Resolution direction:

- only quoted identifiers may contain literal dots as part of a single segment
- unquoted dots always separate path segments

### Backtick identifiers versus reserved keywords

Examples:

```stm
source customer {
  `map` STRING
}
```

Risk:

- reserved words appear both as syntax and as legal quoted identifiers

Resolution direction:

- quoted identifiers are always data names, never keywords
- keyword tokens should only match unquoted forms

### Triple-quoted note bodies versus normal block braces

Risk:

- multiline note bodies can contain braces, brackets, arrows, and keywords that
  should not affect surrounding block parsing

Resolution direction:

- lex note bodies as a dedicated multiline token scoped to `note`
- recovery tests must cover unterminated note blocks

### Line continuation with `\` versus transform continuations

Examples:

```stm
PHONE_NBR -> phone \
  : digits_only | prepend("+1")

LOYALTY_POINTS -> loyalty_tier
  : when < 1000 => "bronze"
```

Risk:

- STM supports both escaped physical line continuation and syntax-level
  continuation lines

Resolution direction:

- line-continuation escaping belongs in the lexical layer
- transform continuation tokens remain explicit grammar constructs

## Medium-Risk Ambiguities

- annotation parameter lists versus function-call transform arguments
- array groups versus primitive array fields
- custom map options versus malformed header content
- import named list braces versus enum/tag braces

## Required Test Focus

Each high-risk ambiguity above should eventually have:

- at least one valid corpus example per side of the ambiguity
- at least one malformed recovery example
- one example taken from or aligned to the current `examples/` corpus where
  applicable
