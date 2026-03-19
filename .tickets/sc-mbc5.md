---
id: sc-mbc5
status: closed
deps: [sc-c09h]
links: [sc-81p5, sc-gokg, sc-aij8, sc-akx6, sc-jais]
created: 2026-03-19T18:43:54Z
type: feature
priority: 3
assignee: Thorben Louw
tags: [stm-cli, context, nl-refs]
---
# stm context: boost relevance for NL backtick references

Extend stm context relevance scoring to consider backtick references in NL blocks. When a query matches a schema or field name that appears as a backtick ref in an NL block, the containing mapping/block should receive a relevance boost. This improves context retrieval for AI agents reasoning about data flow.

## Acceptance Criteria

- Backtick refs in NL blocks contribute to relevance scoring
- A query for a schema name that only appears in NL backtick refs still surfaces the containing block
- Existing context tests still pass
- At least one test demonstrating NL-ref-driven boost

