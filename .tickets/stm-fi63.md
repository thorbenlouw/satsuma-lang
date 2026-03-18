---
id: stm-fi63
status: closed
deps: []
links: []
created: 2026-03-18T21:29:06Z
type: bug
priority: 2
assignee: Thorben Louw
parent: stm-r58z
tags: [validator, cli, feature-12]
---
# Bug 2: Handle schema-qualified references in multi-source mappings

In multi-source mappings, arrows use schema_name.field_name syntax (e.g. crm_customers.customer_id). The validator treats the entire dotted path as a field lookup within mapping.sources[0], instead of recognizing the first segment as a schema qualifier. Affects ~20 warnings in multi-source-join.stm. Root cause: src/validate.js line 112 always uses mapping.sources[0] and compares the full arrow.source path.

## Acceptance Criteria

Schema-qualified arrow paths (crm_customers.email) resolve the schema qualifier before field lookup. Unknown schema qualifiers still warn. stm validate on multi-source-join.stm produces no false field-reference warnings. Test coverage added.

