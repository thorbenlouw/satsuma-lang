---
id: sl-04eg
status: open
deps: []
links: []
created: 2026-03-26T08:30:39Z
type: bug
priority: 2
assignee: Thorben Louw
---
# validate: false field-not-in-schema warning when duplicate mapping names exist across files

When two files define mappings with the same name (e.g. 'order headers' in json-api-to-parquet.stm and xml-to-parquet.stm), workspace-level validate can resolve a mapping's arrows against the wrong file's schema. This produces false 'Arrow source X not declared in schema Y' warnings where Y is the other file's source schema. Single-file validation passes cleanly.

## Acceptance Criteria

1. validate does not produce false field-not-in-schema warnings when duplicate mapping names exist
2. Either: each mapping is validated against its own source/target schemas, OR duplicate-definition is caught first and prevents downstream false warnings

