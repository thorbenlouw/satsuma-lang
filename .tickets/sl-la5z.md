---
id: sl-la5z
status: closed
deps: []
links: [sl-0ycs]
created: 2026-03-21T08:05:56Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, graph, exploratory-testing]
---
# graph: exits with code 0 even when workspace has parse errors

The graph command exits with code 0 even when the workspace contains files with parse errors, contradicting the documented exit code contract where code 2 means 'parse error or filesystem error'. The validate command correctly exits with code 2 for the same files.

What I did:
  Created /tmp/satsuma-test-graph/malformed.stm with invalid syntax.

  Ran: satsuma validate /tmp/satsuma-test-graph/malformed.stm
  Exit code: 2 (correct per docs)

  Ran: satsuma graph /tmp/satsuma-test-graph/malformed.stm --json
  Output includes: {"errors": 2, ...}
  Exit code: 0 (should be 2 per documented contract)

What I expected:
  graph should exit with code 2 when the workspace contains parse errors, consistent with the documented exit codes in SATSUMA-CLI.md:
    0 = Success
    1 = Not found or no results
    2 = Parse error or filesystem error

What actually happened:
  graph exits with code 0 and reports errors in the stats.errors field of JSON output, but the exit code doesn't reflect the error state.

Reproducer: /tmp/satsuma-test-graph/malformed.stm

