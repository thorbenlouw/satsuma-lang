---
id: sl-rovp
status: closed
deps: []
links: []
created: 2026-04-07T09:42:54Z
type: chore
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# docs: reconcile ARCHITECTURE.md claims with reality

Verify every 'consumers never X' claim in ARCHITECTURE.md. Fix violations or update doc. Feature 29 TODO #9.

## Acceptance Criteria

ARCHITECTURE.md matches actual code/test layout.


## Notes

**2026-04-07T10:50:33Z**

Cause: ARCHITECTURE.md asserted 'consumer tests never duplicate core extraction tests', which is contradicted by satsuma-cli/test/extract.test.ts and classify.test.ts. Fix: softened the claim to 'should not' and added an explicit Known Violation note pointing at sl-cvs2 as the de-duplication ticket. Cardinal dependency rule was verified (no upward imports).
