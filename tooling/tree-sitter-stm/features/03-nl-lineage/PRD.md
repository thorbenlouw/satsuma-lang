# Natural Language Lineage Plan

## Goal

Require every `nl()` transform to declare the source fields it reads as explicit parameters so lineage tooling can trace dependencies through natural-language transforms without parsing free-form prompt text.

## Problem

STM currently allows natural-language transforms in the form `nl("...")`. That is useful for underspecified or custom business logic, but it creates a lineage blind spot:

- parsers treat `nl()` as opaque
- linters and graph tooling cannot determine which source fields an `nl()` transform depends on
- prompt text may mention fields informally, inconsistently, or not at all
- downstream lineage becomes incomplete exactly where the transform logic is most complex

This feature closes that gap by making `nl()` dependency inputs explicit and machine-readable.

## Outcome

After this feature lands:

- every `nl()` expression carries an explicit list of source field dependencies
- lineage tools can attribute target fields to the declared `nl()` inputs
- prompt text remains free-form, but lineage no longer depends on text extraction heuristics
- parser and AST consumers have a stable representation for opaque intent plus declared dependencies

## Proposed Syntax

Change `nl()` from:

```stm
nl("Sum all completed transactions per customer")
```

to:

```stm
nl("Sum all completed transactions per customer", amount, status, customer_email)
```

The first argument remains the natural-language instruction string.

All remaining arguments are path references naming the source fields the expression reads.

## Examples

### Single-field transform

```stm
PHONE_NBR -> phone
  : nl("Normalize to E.164, assume US if ambiguous", PHONE_NBR)
```

### Multiple sibling fields

```stm
=> order_date
  : nl("Parse using sibling field DATEFMT: 102=CCYYMMDD, 203=CCYYMMDDHHMM", DATE_RAW, DATEFMT)
```

### Array and nested-field dependencies

```stm
=> gross_revenue
  : nl("For each line, multiply unit price by quantity and sum across the order",
       Order.LineItems[].unit_price,
       Order.LineItems[].quantity)
```

### Cross-source dependency

```stm
=> priority
  : nl("Set high priority when payment status is failed", payment_gateway.status)
```

### Mixed pipeline

```stm
NOTES -> notes
  : nl("Filter profanity using the corporate word list", NOTES)
  | escape_html
  | truncate(5000)
```

## Functional Requirements

### 1. Explicit dependency declaration

Every `nl()` expression must include:

- one leading string literal prompt
- one or more path-reference arguments declaring the source fields read by the expression

Bare `nl("...")` is no longer sufficient for valid lineage-capable STM.

### 2. Dependency arguments are lineage inputs

The declared path references define the lineage inputs for the `nl()` step.

Tooling must:

- treat each declared path as a dependency edge into the enclosing transform
- attribute the enclosing target field to those dependencies
- preserve the declared dependency list in CST/AST output

### 3. Prompt text is descriptive, not authoritative

Tooling must not attempt to infer lineage from the natural-language string when explicit `nl()` parameters are present.

The prompt may mention fields that are omitted, aliased, or described indirectly. The parameter list is the source of truth for lineage.

### 4. Path-reference compatibility

`nl()` dependency arguments should use the same path-reference syntax already accepted elsewhere in STM, including:

- sibling fields
- dotted paths
- array paths such as `LineItems[].sku`
- cross-source qualified paths where STM already permits them

### 5. Stable structured representation

Parser and AST layers should expose `nl()` as a structured node with:

- `prompt`
- `dependencies`

Suggested AST shape:

```json
{
  "type": "nl_transform",
  "prompt": "Sum all completed transactions per customer",
  "dependencies": ["amount", "status", "customer_email"]
}
```

## Validation Rules

Lineage-aware tooling should enforce the following:

- `nl()` must have at least two arguments: prompt plus one dependency
- the first argument must be a string literal
- all remaining arguments must be valid path references
- duplicate dependency paths should be rejected or normalized deterministically
- empty dependency lists are invalid

If the language needs a temporary migration window, a linter warning can bridge the transition, but the end state should require explicit dependencies.

## Parser And Tooling Implications

### Parser

The parser must stop treating `nl()` as an undifferentiated function-like token sequence. It should produce a distinct node for natural-language transforms and parse the dependency path list explicitly.

### AST / IR

AST builders should preserve argument order as written, while lineage engines may canonicalize dependencies for graph purposes.

### Lint

Add a rule for missing or malformed `nl()` dependencies. The existing warning/error behavior around `nl()` implementation status remains separate from this feature.

### Formatter

`stm fmt` should preserve `nl()` dependency arguments and wrap long dependency lists across lines using normal function-call formatting rules.

### Lineage / Visualisation

Graph and documentation tools should render declared `nl()` dependencies exactly like parseable transform inputs so that opaque intent does not break end-to-end lineage.

## Non-Goals

This feature does not require:

- parsing field names out of prompt text
- semantic validation that the prompt text fully matches the declared dependencies
- replacing `nl()` with a fully formal expression language
- changing the free-form nature of the natural-language instruction itself

## Acceptance Criteria

This feature is complete when:

1. STM syntax for `nl()` requires explicit dependency path arguments after the prompt string.
2. The parser produces a dedicated structured node for `nl()` prompt and dependencies.
3. Corpus fixtures cover valid and invalid `nl()` declarations, including nested and array-path dependencies.
4. Example STM files using `nl()` are updated to include dependency arguments.
5. Lineage consumers can build dependency edges from declared `nl()` inputs without reading prompt text.
6. Linting reports `nl()` expressions that omit dependency arguments.

## Open Questions

- Should duplicate dependency paths be a hard error or normalized by tooling?
- Should zero-dependency `nl()` ever be allowed for constant-value generation, or should such cases use a different construct?
- Do we want a migration period where bare `nl("...")` is parsed but linted before becoming invalid syntax?
