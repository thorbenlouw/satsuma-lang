---
id: sc-xnhw
status: in_progress
deps: [sc-291j]
links: []
created: 2026-03-22T20:17:39Z
type: task
priority: 1
assignee: Thorben Louw
parent: sc-v2pn
tags: [examples]
---
# Migrate all example .stm files to unified syntax

Convert all record/list blocks to name-first syntax. Replace [] paths with dot-only paths. Replace nested arrows with each blocks. Replace flatten annotations with flatten blocks. Files: cobol-to-avro, db-to-db, edi-to-json, filter-flatten-governance, protobuf-to-parquet, sap-po-to-mfcs, xml-to-parquet, lib/sfdc_fragments, namespace examples.

## Acceptance Criteria

All .stm files parse with zero errors under new grammar. No record/list keyword-first blocks remain. No [] in field paths.

