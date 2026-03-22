---
id: sl-8zij
status: closed
deps: []
links: [sl-eoco]
created: 2026-03-21T07:59:04Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, context, exploratory-testing]
---
# context: does not search comment text (// //! //?) for query matches

The `satsuma context` command does not search comment content (`//`, `//!`, `//?`) when scoring blocks for relevance. The testing prompt explicitly lists 'Comment matching: Query for text in //, //!, //? comments. Found?' as a test area.

**What I did:**
```
satsuma context "phone" /tmp/satsuma-test-context/ --json
satsuma context "conversion" /tmp/satsuma-test-context/ --json
```

**Expected:** The query 'phone' should match crm_customers because it contains the comment `//? Should we validate phone numbers too?`. The query 'conversion' should match raw_orders because it contains `//! Currency conversion not yet implemented`.

**Actual output:** Both queries return `[]` (empty results).

**Root cause:** In context.ts, the `scoreEntry` function (line 128) only checks `name`, `note`, `fields`, `sources`, and `targets`. Comment text is not included in the workspace index entries or the scoring function.

**Repro files:** /tmp/satsuma-test-context/customers.stm (has //? comment about phone numbers), /tmp/satsuma-test-context/orders.stm (has //! comment about currency conversion)


## Notes

**2026-03-22T02:00:00Z**

Cause: Context scoring only searched NL content, not comment text.
Fix: Include //! and //? comment content when scoring blocks for relevance (commit 6366edd).
