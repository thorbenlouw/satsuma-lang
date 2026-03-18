---
id: stm-q36c
status: open
deps: [stm-j7fc, stm-fwo4, stm-j4ch, stm-daev, stm-xnbx, stm-8l0v, stm-7i0q]
links: []
created: 2026-03-18T16:52:43Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u32p
tags: [cli, feature-10, docs]
---
# Document CLI structural primitives and agent workflow patterns

Update all CLI documentation to reflect the structural-primitives design. Make the CLI's intended limitations explicit: what it can do (structural extraction), what it cannot do (NL interpretation), and why the boundary exists. Include agent workflow patterns showing how to compose primitives for impact, coverage, audit, mapping draft, and readiness.

## Acceptance Criteria

- [ ] stm --help uses three-tier grouping (workspace extractors, structural primitives, structural analysis) with a one-line statement that the CLI is deterministic and does not interpret NL
- [ ] Each new command's --help states (1) what structural operation it performs and (2) that NL content is extracted verbatim, not interpreted
- [ ] STM-CLI.md updated with complete command reference, transform classification table, and "What the CLI Does Not Do" section
- [ ] STM-CLI.md includes "How Agents Compose Primitives" section with worked examples: impact, coverage, audit, mapping draft, change review
- [ ] AI-AGENT-REFERENCE.md CLI section updated with primitive commands and agent responsibility table
- [ ] Documentation explicitly states: no impact/coverage/audit/scaffold/inventory commands exist because their correctness depends on NL interpretation
- [ ] Documentation explains the transform classification markers (structural, nl, mixed, none) and that they are mechanical CST node-type checks

