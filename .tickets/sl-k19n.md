---
id: sl-k19n
status: closed
deps: []
links: []
created: 2026-03-24T08:15:02Z
type: bug
priority: 3
assignee: Thorben Louw
tags: [parser, grammar]
---
# ref metadata does not support namespace-qualified schema.field paths

The `ref` metadata tag does not support namespace-qualified paths with field references when combined with a namespace prefix. `ref schema.field` works correctly (parses as `dotted_name`), but `ref ns::schema.field` fails because the parser handles `ns::schema` as a `qualified_name` but can't attach the `.field` suffix.

Repro:
```stm
// This WORKS:
isin STRING(12) (ref other_schema.field)

// These FAIL:
instrument_isin STRING(12) (ref exchange_refs::instrument_ref.isin)
// Error: parse error at '.isin'

order_id UUID (ref oms::internal_order.order_id)
// Error: parse error at '.order_id'
```

Workaround: Use `note "FK to ns::schema.field"` instead of `ref`.

Note: The spec only shows `ref schema.field` examples (e.g. `ref addresses.id`), not namespace-qualified refs. This may be a feature gap rather than a parser bug, but since namespace-qualified schemas exist and `ref` should reference them, this is a valid parser limitation.

## Acceptance Criteria

1. ~~`ref schema.field` parses correctly~~ (already works)
2. `ref ns::schema.field` parses correctly
3. CLI commands (`meta`, `find`, `validate`) correctly handle namespace-qualified refs
4. Tree-sitter corpus test added

## Notes

**2026-03-24T08:45:00Z**

Cause: The `_kv_value` rule had `qualified_name` (ns::schema) and `dotted_name` (schema.field) but no combined form for `ns::schema.field`.
Fix: Added `qualified_dotted_name` rule (`qualified_name` followed by one or more `.identifier` segments) and placed it in `_kv_value` before `dotted_name`. Added two corpus tests: single-segment and multi-segment qualified dotted refs. CLI handling (AC #3) deferred — parser now produces the correct CST nodes. (commit pending)

