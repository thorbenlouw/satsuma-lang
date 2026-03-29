---
id: sl-nknd
status: closed
deps: []
links: []
created: 2026-03-29T09:00:47Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, field-lineage, exploratory-testing]
---
# field-lineage: --upstream --downstream together produces empty results

Fixture: /tmp/satsuma-test-field-lineage/b-basic/chain.stm
Command: satsuma field-lineage stage.val /tmp/satsuma-test-field-lineage/b-basic/ --upstream --downstream --json

Expected: Both upstream and downstream populated, equivalent to running with no direction flags.
Actual:
{
  "field": "::stage.val",
  "upstream": [],
  "downstream": []
}

Root cause: In field-lineage.ts:
  const doUpstream = !opts.downstream;   // false when --downstream is set
  const doDownstream = !opts.upstream;   // false when --upstream is set

When both flags are provided, both evaluate to false, suppressing all traversal. The intended semantics should be: if both are set, treat as both enabled (same as neither set).


## Notes

**2026-03-29T11:39:32Z**

**2026-03-29T11:39:32Z**

Cause: doUpstream/doDownstream evaluated to false when both --upstream and --downstream were set, because each was the negation of the other flag.
Fix: Changed to `opts.upstream || !opts.downstream` (and symmetric for downstream) so both-set means both-enabled. (commit pending)
