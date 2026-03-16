---
id: stm-o50b
status: closed
deps: [stm-14x.7]
links: []
created: 2026-03-16T13:46:39Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-t1n8
---
# Define STM highlighting taxonomy and parser-sharing contract

Establish the shared syntax inventory, TextMate scope mapping, parser/editor token mapping, and test strategy for the STM VS Code extension before grammar implementation begins. This task should lock what the extension can highlight reliably, what remains approximate in TextMate, and how parser outputs will be reused to reduce drift.

## Acceptance Criteria

The STM syntax inventory is documented from STM-SPEC.md, examples, and parser conventions.
A token taxonomy maps STM constructs to standard TextMate scopes.
Ambiguous constructs that must remain approximate in TextMate are explicitly listed.
A parser/editor token mapping note or placeholder exists and identifies future semantic-token opportunities.
The highlighting test strategy, fixture layout, and non-interactive test harness are chosen before grammar work starts.

