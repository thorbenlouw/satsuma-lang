---
id: sl-a8je
status: closed
deps: []
links: []
created: 2026-04-07T09:42:54Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-63ix
---
# tests: add direct unit tests for viz-model.ts

viz-model.ts (1370 lines) has no dedicated unit tests. Add tests for each top-level extract* builder against parsed CST input. Replace 'as unknown as CommentEntry[]' cast. Feature 29 TODO #10.

## Acceptance Criteria

Each top-level extract* builder has direct tests asserting VizModel shape via deepStrictEqual. Cast removed.


## Notes

**2026-04-07T14:49:13Z**

Cause: viz-model.ts had no direct unit tests for the per-builder extract* helpers, and findPrecedingBlock cast fragment.notes (NoteBlock[]) to CommentEntry[] because FragmentCard had no comments field.
Fix: added test/viz-model-builders.test.js with deepStrictEqual shape tests for each top-level extract* builder; exposed builders via _testInternals export; added comments: CommentEntry[] to FragmentCard, populated it in extractFragment, and removed the cast in findPrecedingBlock; added test:coverage script (c8) to satsuma-viz-backend (viz-model.ts now reports 92% line coverage).

**2026-04-07T14:55:38Z**

Coverage rollout (per user request to bundle into this ticket): added c8 + test:coverage to satsuma-core, satsuma-viz-model, satsuma-viz, satsuma-lsp (viz-backend already done). Added top-level 'npm run test:coverage' aggregator. Updated CI: new 'tooling-modules' job runs test:coverage for core/viz-model/viz-backend/viz and uploads each as a coverage-<module> artifact; vscode-extension job's LSP test step now wraps in c8; coverage-report job depends on all of them and posts one sticky PR comment per module via davelosert/vitest-coverage-report-action.
