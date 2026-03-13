# STM Tree-Sitter Precedence Strategy

## Purpose

This note captures the initial precedence and parse-boundary strategy for the
STM Tree-sitter grammar. It is intentionally short and should be updated if the
grammar requires explicit conflict declarations later.

## Core Strategy

- Keep declaration parsing and expression parsing in separate contexts.
- Prefer explicit context over broad expression rules.
- Model multiline transform continuations as distinct grammar nodes instead of
  trying to flatten them into a single free-form expression rule.
- Preserve statement boundaries with newline-aware parsing where STM requires
  it, especially inside map entries and note blocks.

## Planned Boundaries

### Declarations before expressions

At top level, parse only declarations:

- `import_declaration`
- `integration_block`
- `schema_block`
- `fragment_block`
- `map_block`

Expression-like syntax such as `map { ... }` or `when ... => ...` should only
exist inside map-entry transform contexts.

### Paths before generic identifiers in mapping heads

In mapping positions:

- parse `source_path` / `target_path` before falling back to generic identifiers
- treat `[]` as part of path-segment parsing, not a later semantic rewrite

This avoids reparsing field paths in the AST layer.

### Group and field disambiguation

Within schema and fragment bodies:

- prefer group parsing when an identifier is followed by `{`
- prefer array-group parsing when `[]` is followed by `{`
- otherwise parse as field declarations

### Transform clauses over broad expressions

Within map entries:

- the token after `:` selects transform parsing
- `|` starts a `pipe_step`
- `when` starts a `when_clause`
- `else` starts an `else_clause`
- `fallback` starts a `fallback_clause`

This should reduce ambiguity compared with a single generic continuation rule.

### Tags and annotations remain postfix

For schema declarations:

- type expression binds first
- tag list binds after the type
- annotations bind after tags
- note blocks attach after the declaration line

This mirrors the written STM spec and simplifies formatting later.

## Conflict Policy

- Avoid broad `conflicts` declarations until targeted corpus tests demonstrate a
  real need.
- If conflicts are unavoidable, document each one near the rule and in this
  file with the motivating syntax example.
- CI should fail on undocumented parser conflicts.
