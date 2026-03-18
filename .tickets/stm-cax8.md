---
id: stm-cax8
status: closed
deps: [stm-c9pj, stm-4bjz]
links: []
created: 2026-03-18T10:46:39Z
type: task
priority: 2
assignee: Thorben Louw
tags: [vscode-v2]
---
# Validate grammar against v2 examples and fixtures

Run npm test for all vscode-tmgrammar-test fixtures. Test grammar against all files in examples-v2/ (db-to-db, edi-to-json, xml-to-parquet, sfdc_to_snowflake, common, protobuf-to-parquet, multi-source-hub). Visual inspection in Dark+ and Light+ themes. Verify malformed fixtures degrade gracefully — especially unterminated triple-quote blocks.

