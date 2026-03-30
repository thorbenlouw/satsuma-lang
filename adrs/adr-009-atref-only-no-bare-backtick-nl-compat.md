# ADR-009 — @ref Is the Sole NL Reference Syntax; Bare-Backtick NL Compat Dropped

**Status:** Accepted
**Date:** 2026-03-30 (sl-j4eg)

## Context

Satsuma NL strings support inline field and schema references so that lineage
tooling can trace implicit data dependencies even when the transform logic is
expressed in prose. Two syntaxes were considered during development:

**Bare-backtick syntax (v1 / transitional):**
```satsuma
"Convert amount using `exchange_rates.spot`"
"Look up `crm::customers.id` in the dim"
```

**@ref syntax (finalised v2):**
```satsuma
"Convert amount using @exchange_rates.spot"
"Look up @crm::customers.id in the dim"
```

The `@` sigil was added because backtick-quoting already has a structural job in
Satsuma — it is the mechanism for quoting identifiers whose names contain
characters outside `[a-z0-9_-]` (e.g. `` schema `order-headers` { } `` or
`` source { `raw::crm-contacts` } ``). Using bare backticks for a second,
semantically distinct purpose (NL cross-references) created two problems:

1. **Ambiguity for tooling.** A bare backtick span `` `something` `` inside an
   NL string could be Markdown-style emphasis or a lineage-significant reference.
   The extractor had to guess and produced false positives and missed refs.

2. **Ambiguity for authors and agents.** Authors writing NL transforms had no
   clear signal that `` `field_name` `` was anything more than Markdown emphasis.
   AI agents generating Satsuma used backtick-quoting inconsistently.

The `@` sigil solves both problems: it is unambiguous, unambiguously intentional,
and has no alternative meaning in Satsuma syntax.

The v2 grammar added the `at_ref` CST node for `@`-prefixed references (with
optional backtick-quoting of unsafe name segments, e.g.
`@raw::\`crm-contacts\`.\`customer-id\``). At that point the bare-backtick path
should have been removed, but a backward-compatibility block (`BACKTICK_RE`) was
left in `nl-ref.ts` — extracting bare-backtick spans as implicit refs — along
with matching highlighting in the VS Code extension.

## Decision

**@ref is the only supported syntax for NL cross-references.** Bare backtick
spans inside NL strings are not extracted as lineage references. Tooling does not
highlight or navigate them as references.

Specifically (implemented in sl-j4eg):

- `extractAtRefs` (previously `extractBacktickRefs`) extracts only `@`-prefixed
  refs. The `BACKTICK_RE` backward-compat extraction loop is removed.
- The VS Code extension does not highlight bare-backtick spans inside NL strings
  as variable references. Only `@`-prefixed spans get the `nlRef` semantic token.
- The `unresolved-nl-ref` lint rule fires only on unresolved `@ref`s, not on
  backtick spans.
- All corpus examples and examples that used bare-backtick NL refs have been
  updated to `@ref` syntax.

Backtick-quoting of **identifier labels** (schema names, field names, namespace
qualifiers) is unaffected. It remains the standard quoting mechanism for unsafe
names throughout the language.

## Consequences

**Positive:**
- Unambiguous lineage extraction — `@` sigil has exactly one meaning
- No false-positive `unresolved-nl-ref` lint warnings from Markdown-emphasis backticks
- Simpler extractor (one regex, no compat branch)
- AI agents generate consistent, lintable @ref syntax
- Authors get clear IDE feedback (only `@`-prefixed refs underlined/navigable)

**Negative:**
- Any `.stm` file with bare-backtick NL refs written before @ref was finalised
  loses implicit lineage edges. `satsuma lint` surfaces these as
  `unresolved-nl-ref` warnings (the `@` is missing, so the ref text doesn't
  parse as an `at_ref` node and is invisible to tooling). Authors must migrate
  them to `@ref` form. `satsuma lint --fix` does not autofix this — the ref text
  must be reviewed to confirm it is actually an intentional lineage reference.
