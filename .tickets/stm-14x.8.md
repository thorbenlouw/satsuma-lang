---
id: stm-14x.8
status: closed
deps: [stm-14x.6, stm-14x.7]
links: []
created: 2026-03-13T13:46:55Z
type: task
priority: 1
parent: stm-14x
---
# Wire parser quality gates into docs and CI

Add repeatable commands and CI checks for parser generation, corpus tests, query tests if present, and example parsing. CI should fail on undocumented grammar conflicts and keep parser support aligned with the documented STM version.

## Acceptance Criteria
- Project docs describe how to generate the parser, run corpus/fixture tests, and run example parsing locally.
- CI runs parser tests plus a pass over every `.stm` example file.
- CI fails when parser conflicts appear unless they are explicitly accepted and documented in the parser package.
- The parser README states the supported STM version and current non-goals.
- At least one CI-oriented smoke check verifies the consumer proof or example parse command so parser usability does not silently regress.


## Acceptance Criteria

- Project docs describe how to generate the parser, run corpus/fixture tests, and run example parsing locally.
- CI runs parser tests plus a pass over every `.stm` example file.
- CI fails when parser conflicts appear unless they are explicitly accepted and documented in the parser package.
- The parser README states the supported STM version and current non-goals.
- At least one CI-oriented smoke check verifies the consumer proof or example parse command so parser usability does not silently regress.


