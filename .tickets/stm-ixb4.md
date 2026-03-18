---
id: stm-ixb4
status: open
deps: []
links: []
created: 2026-03-18T18:56:33Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-q2cz
tags: [parser, tree-sitter, metadata]
---
# Extend metadata grammar for spec-backed value forms

Cover numeric, boolean, quoted, dotted, decimal, namespace, filter, ref, format, and tag metadata forms used by the examples.

## Acceptance Criteria

Corpus tests cover default 0, default false, default "USD", ref addresses.id, format E.164, namespace ord "...", filter QUAL == "ON", tag 1, and error_threshold 0.02.
The grammar parses those forms without recovery errors.
examples/db-to-db.stm, examples/edi-to-json.stm, examples/lib/sfdc_fragments.stm, examples/multi-source-join.stm, examples/protobuf-to-parquet.stm, examples/sfdc_to_snowflake.stm, and examples/xml-to-parquet.stm no longer fail on those metadata constructs.

