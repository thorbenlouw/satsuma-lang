---
id: sl-yjga
status: closed
deps: []
links: []
created: 2026-03-30T06:39:22Z
type: chore
priority: 3
assignee: Thorben Louw
---
# types.ts: add doc-comments to Classification type and MetaEntrySlice interface

tooling/satsuma-core/src/types.ts has two documentation gaps on exported types:

1. The Classification type (line ~33) lists four string literals but does not explain what each means or when each is assigned. In particular 'nl-derived' vs 'nl' is not obvious — when is a transform nl-derived rather than nl?

2. MetaEntrySlice interface (lines ~63-66) has no doc-comment. It is not obvious from the name alone what a 'slice' represents in this context, how it differs from a full MetaEntry, or who creates and consumes it.

## Acceptance Criteria

- Classification has a doc-comment explaining each member: what 'nl', 'nl-derived', and any other values mean, and which part of the system assigns each
- MetaEntrySlice has a doc-comment explaining what it represents, how it differs from a full MetaEntry, and the typical consumer
- All existing types tests pass (types.ts is a pure declaration file; any related test that imports these types should still compile)


## Notes

**2026-03-30T09:44:41Z**

Cause: Classification type had no doc-comment — the distinction between 'nl', 'mixed', and 'nl-derived' was not obvious from the name alone. MetaEntrySlice had no doc-comment explaining what a slice is or who creates/consumes it. Fix: added a doc-comment to Classification explaining all five members and how each is assigned; added a doc-comment to MetaEntrySlice explaining that it represents the dimension schema names from a metric's slice { } metadata entry. All 862 tests pass.
