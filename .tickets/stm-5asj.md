---
id: stm-5asj
status: open
deps: []
links: []
created: 2026-03-16T14:42:26Z
type: bug
priority: 2
assignee: Thorben Louw
parent: stm-14x
tags: [grammar, parser]
---
# Fix grammar conflicts for inline map literals, wildcard keys, and computed entries in sfdc_to_snowflake.stm

The tree-sitter grammar defines rules for value_map_literal, wildcard, and computed_map_entry, but these fail to parse correctly in examples/sfdc_to_snowflake.stm, producing ERROR nodes at five locations.

Specific parse failures (0-indexed lines):
1. [98,6]-[98,11]: Multi-line value_map_literal in transform position (map { Prospecting: "top_funnel", ... })
2. [104,8]-[104,9]: Wildcard default key (_: "unknown") inside a multi-line value_map_literal
3. [107,2]-[107,14]: Computed map entry (=> is_closed) not recognised after preceding map block
4. [108,4]-[108,15]: Transform source (: StageName) on computed map entry
5. [109,4]-[109,5]: Pipe continuation (| map { ... }) with inline value_map_literal

These are all valid STM constructs per STM-SPEC.md (§ Inline Value Mapping, § Computed Fields, EBNF computed_map). The grammar already has the relevant rules but dynamic precedence or conflict resolution prevents them from matching in this file.

Discovered during stm-14x.7 (CST summary consumer proof).

## Acceptance Criteria

- sfdc_to_snowflake.stm parses with zero ERROR/MISSING nodes
- Smoke test expectation for sfdc_to_snowflake.stm can be updated to parse_ok: true
- Corpus tests cover multi-line value_map_literal, wildcard keys, and computed entries after map blocks

