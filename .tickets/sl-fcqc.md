---
id: sl-fcqc
status: open
deps: [sl-o9mh]
links: []
created: 2026-03-31T09:45:46Z
type: task
priority: 2
assignee: Thorben Louw
tags: [examples, testing, adr-022]
---
# ADR-022: align examples and testing prompts with file-based CLI workspaces

Each example workspace should have a clear entry file for the file-based CLI model. This task is to make examples and prompts reflect that model consistently.

Example directories to update:
- examples/cobol-to-avro/
- examples/db-to-db/
- examples/edi-to-json/
- examples/filter-flatten-governance/
- examples/json-api-to-parquet/
- examples/lookups/
- examples/merge-strategies/
- examples/metrics-platform/
- examples/multi-source/
- examples/namespaces/
- examples/protobuf-to-parquet/
- examples/reports-and-models/
- examples/sap-po-to-mfcs/
- examples/sfdc-to-snowflake/
- examples/xml-to-parquet/

For each: identify or create the entry file that should be used for CLI commands, and update `examples/README.md` to document that invocation clearly.

Also update all 18 `testing-prompts/test-*.md` files to use file-based commands.
Also update `skills/` and `useful-prompts/` if they reference directory-level commands.
