---
id: stm-c9pj
status: open
deps: [stm-ffar]
links: []
created: 2026-03-18T10:46:17Z
type: task
priority: 2
assignee: Thorben Louw
tags: [vscode-v2]
---
# Create test fixture files for v2 constructs

Write focused .stm fixture files under tooling/vscode-stm/test/fixtures/ covering all v2 constructs: schema-basic, schema-nested (record/list), fragment-spread, mapping-basic, mapping-transforms, mapping-computed, map-block, import-statement, note-block, comments, strings (all 4 forms), transform-block, nested-mapping, xml-metadata. Add vscode-tmgrammar-test scope assertions. Also create malformed fixtures: unterminated-string, unterminated-triple-quote, missing-brace, incomplete-arrow, partial-import.

