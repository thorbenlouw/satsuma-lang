---
id: cbh-fmtb
status: closed
deps: []
links: [cbh-7rvo, cbh-gz2v, cbh-s9w6, cbh-myj2]
created: 2026-03-25T11:24:08Z
type: epic
priority: 2
assignee: Thorben Louw
---
# JSON output consistency (row numbering and structure)

Three commands use 0-based row in JSON while all others use 1-based line. validate --json uses a bare array while lint --json uses a structured object. These should be unified to a consistent contract.

