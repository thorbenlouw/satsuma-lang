---
id: sl-yml8
status: open
deps: []
links: []
created: 2026-03-30T06:38:39Z
type: chore
priority: 2
assignee: Thorben Louw
---
# nl-ref.ts: document and decompose resolveRef() (101-line function)

tooling/satsuma-core/src/nl-ref.ts lines 222-323: resolveRef() is a 101-line function that classifies an @ref string against a workspace index and returns a ResolvedAtRef. It handles multiple distinct cases (schema ref, field ref, mapping ref, metric ref, ambiguous ref, unresolved ref) through a long chain of conditionals.

The function has a single-line doc-comment that does not explain the classification algorithm or the cases. A reader must trace the full 101-line body to understand what kinds of refs exist and how each is resolved.

Secondary issues:
- Lines 274-289: workspace-wide fallback search is unexplained — why is a second pass needed? Under what conditions does the local-scope search fail?
- Lines 176-204: three related helpers (hasNestedFieldPath, matchPath, searchNestedPath) have minimal doc-comments; their division of responsibility is unclear

## Acceptance Criteria

- resolveRef() is preceded by a section comment that enumerates the resolution cases in plain English (e.g. 'Case 1: bare name matching a schema in the mapping sources; Case 2: dotted path matching a field on a source schema; ...') so a reader can orient before reading the code
- The workspace-wide fallback pass (lines 274-289) has a comment explaining when local resolution fails and why the fallback is needed
- hasNestedFieldPath, matchPath, and searchNestedPath each have a doc-comment explaining their specific role and how they relate to each other
- All existing nl-ref tests pass

