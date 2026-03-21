---
id: sl-z3eg
status: open
deps: []
links: [sl-m02g]
created: 2026-03-21T08:03:55Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, graph, exploratory-testing]
---
# graph: row field uses 0-indexed values while arrows command uses 1-indexed line values

The graph command outputs row numbers using 0-indexed values (tree-sitter convention) in both nodes and edges, while the arrows command outputs 1-indexed line numbers. This inconsistency means the same arrow shows different line numbers depending on which command is used.

What I did:
  Created /tmp/satsuma-test-graph/single.stm with an arrow on line 17 (1-indexed):
    id -> id { to_string }

  Ran: satsuma arrows source_a.id /tmp/satsuma-test-graph/single.stm --json
  Result: {"line": 17, ...}  (correct, 1-indexed)

  Ran: satsuma graph /tmp/satsuma-test-graph/single.stm --json
  Result: edge has {"row": 16, ...}  (0-indexed)

What I expected:
  Both commands should use the same field name and indexing convention for line/row numbers. Either:
  a) Both use 'row' with 0-indexed values (tree-sitter convention), or
  b) Both use 'line' with 1-indexed values (human convention)

What actually happened:
  graph uses 'row' (0-indexed): nodes and edges report row=0 for line 1
  arrows uses 'line' (1-indexed): line=17 for the actual line 17
  summary and schema also use 'row' (0-indexed)

  The same arrow (id -> id { to_string }) is reported as row:16 by graph and line:17 by arrows.

Reproducer: /tmp/satsuma-test-graph/single.stm

