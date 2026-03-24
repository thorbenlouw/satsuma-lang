---
id: sl-yai3
status: closed
deps: []
links: []
created: 2026-03-24T23:47:48Z
type: task
priority: 3
assignee: Thorben Louw
tags: [docs, schema-formats, marc21]
---
# MARC21 convention example: close gaps for round-trip fidelity

The MARC21 example in docs/conventions-for-schema-formats/marc21/ captures tag numbers, subfield codes, repeatability, and 008 positional encoding well, but has gaps that would prevent round-trip fidelity or reliable code generation.

## Acceptance Criteria

1. Leader (LDR) record added with record_status, record_type, encoding_level, charset fields
2. Indicator semantics clarified: convention for indicator-as-data vs indicator-as-filter documented
3. ADDED_AUTHORS (700) ind1 modeled with name_type enum
4. 008 coverage expanded or uncovered positions explicitly listed in a note
5. Schema-level note added about ISBD punctuation convention
6. Encoding/charset captured via LDR position 09

