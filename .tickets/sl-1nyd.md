---
id: sl-1nyd
status: closed
deps: []
links: [sl-eoco]
created: 2026-03-21T07:59:13Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, context, exploratory-testing]
---
# context: does not search NL transform strings for query matches

The `satsuma context` command does not search the natural-language text inside transform bodies (quoted strings in arrow transforms) when scoring blocks. Only backtick references extracted from NL text are boosted, but the free text itself is not searched. The testing prompt explicitly lists 'NL transform matching: Query for text inside NL transform strings. Found?' as a test area.

**What I did:**
```
satsuma context "surrogate" /tmp/satsuma-test-context/ --json
satsuma context "exchange rates" /tmp/satsuma-test-context/ --json
```

**Expected:** The query 'surrogate' should match the 'orders to dimension' mapping because it contains the NL transform `"Generate surrogate key using hash of order_number"`. The query 'exchange rates' should match the same mapping because it contains `"Convert total_amount from currency to USD using daily exchange rates"`.

**Actual output:** Both queries return `[]` (empty results).

**Root cause:** In context.ts, the scoring function only checks block names, notes, field names/types, source/target refs, and NL backtick refs. The full NL transform text is never scored. The NL backtick ref boost (lines 155-188) only extracts backtick references, not the surrounding natural language text.

**Repro files:** /tmp/satsuma-test-context/orders.stm (has NL transforms with 'surrogate key' and 'exchange rates')

