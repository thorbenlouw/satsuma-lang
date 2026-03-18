---
id: stm-4bjz
status: closed
deps: [stm-8q1r, stm-xvpb, stm-89tv]
links: []
created: 2026-03-18T10:46:37Z
type: task
priority: 2
assignee: Thorben Louw
tags: [vscode-v2]
---
# Implement field declaration and mapping body patterns

Add TextMate patterns for: field declarations (name TYPE (metadata) inside schema/fragment/record/list bodies), mapping arrows (direct src -> tgt, with transform src -> tgt { ... }, computed -> tgt { ... }), dotted paths (Order.Customer.Email), array paths (LineItems[].SKU), relative paths (.REFNUM), arrow metadata (note '...'). Add map {} block patterns: basic key: 'value', conditional < 1000: 'bronze', default/wildcard default: and _:.

