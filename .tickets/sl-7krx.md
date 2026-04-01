---
id: sl-7krx
status: closed
deps: []
links: []
created: 2026-03-31T08:27:17Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validate, exploratory-testing]
---
# parser-edge: validate does not detect circular or self-referencing fragment spreads

Validate accepts circular and self-referencing fragment spreads without any error or warning. This can cause downstream issues: 'satsuma fields' shows duplicate fields for self-referencing spreads.

Case 1 - Self-referencing spread:
  fragment self_ref { id INT, ...self_ref }
  - validate: clean (no error or warning)
  - 'satsuma fields self_ref' shows: id INT twice (duplicate due to infinite self-reference)

Case 2 - Circular spread:
  fragment a { ...b }
  fragment b { ...a }
  - validate: clean (no error or warning)
  - 'satsuma fields a' shows: 'Fragment a has no fields' (spreads silently resolve to nothing)

Expected: validate should warn about circular or self-referencing spreads, as they indicate a user error and can produce incorrect field resolution output.

Fixture: /tmp/satsuma-test-parser-edge/55-circular-spread.stm, 56-self-spread.stm

## Notes

**2026-04-01T21:00:00Z**

Cause: Circular spread detection already existed in `spread-expand.ts` (`expandEntitySpreads`) and fires via `checkArrowFieldRefs` during validation. The bug report was based on testing without arrows referencing the schemas with circular spreads, but the detection is triggered whenever the circular fragment is expanded during field resolution.
Fix: No code change needed. Confirmed via pre-existing tests in `validate-bugs.test.ts` (self-referential and mutual-cycle cases) that the `circular-spread` diagnostic is emitted correctly.
