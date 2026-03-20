---
id: sg-u8sh
status: closed
deps: []
links: []
created: 2026-03-20T15:05:34Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validator]
---
# Validator does not expand fragment spreads when checking field-not-in-schema

When validating arrows, the CLI resolves fields against the raw schema body but does not inline fragment spreads (`...fragment_name`). This means fields contributed by a spread fragment are not recognised, causing spurious `field-not-in-schema` warnings for any arrow that references a fragment-contributed field.

## Acceptance Criteria

1. Arrow sources/targets that resolve to fields contributed by a `...fragment` spread pass validation without `field-not-in-schema` warnings.
2. Existing tests continue to pass — no regressions in non-fragment validation.
3. At least one corpus or integration test covers a mapping arrow referencing a fragment-spread field.

