---
id: stm-gde5
status: open
deps: []
links: [stm-7rz4]
created: 2026-03-19T08:36:42Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [validate, cli]
---
# Validate: cross-file import resolution for field-not-in-schema check

stm validate does not resolve schemas across files or through import statements. Fields that ARE declared in a source schema are incorrectly flagged as missing when the mapping and schema are in the same file but the validator fails to match them. Affects ~30 false-positive warnings in feature 06 examples.

## Acceptance Criteria

- Fields declared in a schema in the same file are found by field-not-in-schema validation
- Fields from schemas imported via `import { } from` are resolved correctly
- Reproduce: `stm validate features/06-data-modelling-with-stm/example_datavault/hub-store.stm` — fields like STORE_NAME, ADDR_LINE_1 etc. in pos_oracle should not be flagged
- Reproduce: `stm validate features/06-data-modelling-with-stm/example_kimball/dim-store.stm` — same fields

