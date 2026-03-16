---
id: stm-14x.6
status: open
deps: [stm-14x.5]
links: []
created: 2026-03-13T13:46:54Z
type: task
priority: 2
parent: stm-14x
---
# Build corpus, fixture, query, and recovery coverage

Turn the parser into a tested grammar package by adding feature-focused corpus files, full-file fixtures for every example under `examples/`, malformed recovery fixtures, and initial highlight/fold queries with query tests where supported.

## Acceptance Criteria
- `test/corpus/` is split by feature area and includes valid coverage for top-level declarations, schema constructs, paths, map entries, transforms, comments, notes, tags, and annotations.
- Every `.stm` file under `examples/` is parsed by automated fixture tests.
- Malformed fixtures cover at least missing `}`, unterminated note, broken tag list, partial transform line, and incomplete path after `->`.
- `queries/highlights.scm` and `queries/folds.scm` exist and cover the main syntactic categories used by editor tooling.
- Test output makes it obvious which fixture or corpus case failed, supporting fast grammar iteration.


## Acceptance Criteria

- `test/corpus/` is split by feature area and includes valid coverage for top-level declarations, schema constructs, paths, map entries, transforms, comments, notes, tags, and annotations.
- Every `.stm` file under `examples/` is parsed by automated fixture tests.
- Malformed fixtures cover at least missing `}`, unterminated note, broken tag list, partial transform line, and incomplete path after `->`.
- `queries/highlights.scm` and `queries/folds.scm` exist and cover the main syntactic categories used by editor tooling.
- Test output makes it obvious which fixture or corpus case failed, supporting fast grammar iteration.



## Notes

**2026-03-16T12:39:37Z**

Partially complete as of 2026-03-16. Done: corpus split by feature area (8 files), highlights.scm and folds.scm exist, recovery cases for missing } (2 variants) and broken tag list. Still needed: full-file fixture tests for examples/*.stm (no test/fixtures/ dir yet), and recovery corpus cases for unterminated note, partial transform line, and incomplete path after ->.
