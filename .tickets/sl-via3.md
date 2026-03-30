---
id: sl-via3
status: open
deps: []
links: []
created: 2026-03-30T18:22:27Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-jvwu
tags: [core, cli]
---
# core: add escape handling to stringText() and reconcile with CLI stripDelimiters()

Core's stringText() strips delimiters from nl_string and multiline_string but does NOT handle escape sequences. The CLI's stripDelimiters() in nl-extract.ts correctly interprets \" as " and \\\\ as \\. The LSP's stripQuotes() also lacks escape handling — meaning viz-model receives raw escape sequences in NL strings (likely a bug).

**Which implementation wins:** CLI's — it correctly unescapes. Core should adopt this behaviour in stringText().

**Work:**
1. Add escape handling to core's stringText() for nl_string nodes: replace /\\\"/g with '"' and /\\\\\\\\/g with '\\' after stripping delimiters.
2. Add unit tests in core for: empty string, string with escaped quotes, string with escaped backslashes, multiline strings (no escape handling needed — they use triple-quote raw syntax).
3. Verify no downstream breakage in CLI or LSP from the richer return value (escaped text is strictly more correct).
4. Delete CLI's stripDelimiters() in nl-extract.ts; replace call site with core's stringText().

**Validation before PR:**
- All core, CLI, and LSP tests pass
- Code meets AGENTS.md standards: doc-comment on stringText() explains escape handling contract, test cases named by behaviour
- Review: no other local string-stripping helpers remain in CLI or LSP that should use this

## Acceptance Criteria

- Core stringText() handles \\" and \\\\\\\\ escape sequences in nl_string nodes
- CLI stripDelimiters() is deleted; call site uses core stringText()
- Core test suite covers escape edge cases
- No consumer duplicates this logic

