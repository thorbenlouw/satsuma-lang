---
id: sl-teg4
status: open
deps: []
links: []
created: 2026-03-30T06:38:13Z
type: chore
priority: 2
assignee: Thorben Louw
---
# lint-engine.ts: document KNOWN_PIPELINE_FUNCTIONS and decompose makeAddSourceFix / makeAddArrowSourceFix

tooling/satsuma-cli/src/lint-engine.ts has two high-severity readability defects:

1. Lines 266-273: KNOWN_PIPELINE_FUNCTIONS is a hardcoded set of function names with no source documentation. A reader cannot tell where this list comes from, whether it is complete, or how to add to it. It reads as arbitrary magic.

2. Lines 123-182 and 188-264: makeAddSourceFix() (~60 lines) and makeAddArrowSourceFix() (~75 lines) are long functions returning closures, with complex regex-based line parsing and multiple magic string patterns (e.g. /^source\s*\{([^}]*)\}$/). The two functions are structurally near-identical, signalling missed factoring. The regexes are unexplained.

## Acceptance Criteria

- KNOWN_PIPELINE_FUNCTIONS has a comment citing the source of the list (spec section, external reference, or explicit 'this is the exhaustive list as of vX') so a reader knows the intent and how to maintain it
- makeAddSourceFix and makeAddArrowSourceFix are refactored to share their common structure, or each has a section comment explaining the algorithm (parse current block → insert new entry → reconstruct) so the regex logic is readable
- All regex literals that encode structural patterns have a named constant or inline comment explaining what they match and why
- All existing lint-engine tests pass

