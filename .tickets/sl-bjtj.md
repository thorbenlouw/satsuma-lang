---
id: sl-bjtj
status: closed
deps: []
links: []
created: 2026-03-31T08:32:16Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, consistency, exploratory-testing]
---
# consistency: JSON output uses 'row' in some commands and 'line' in others for line numbers

Commands: multiple CLI commands with --json output
All commands output line number information for locating results in source files, but they inconsistently use different field names:

Uses 'row': summary, schema, mapping, warnings, where-used, context
Uses 'line': graph, arrows, find, nl-refs, validate

This makes it impossible to write generic JSON processing code that works across all CLI commands without special-casing the field name. A downstream consumer parsing results from multiple commands must know which field name each command uses.

All commands should use the same field name. The CLI docs (exit codes section) don't specify which name to use, so either is acceptable — but they must be consistent.

Tested against examples/multi-source and examples/sfdc-to-snowflake.


## Notes

**2026-03-31T12:20:08Z**

Cause: 6 commands used 'row' as JSON field name for line numbers while 5 used 'line', making generic JSON processing impossible.
Fix: Standardized all commands to use 'line' (1-indexed) in JSON output: summary, schema, mapping, warnings, where-used, context. Also fixed where-used fragment_spread/transform_call/import refs that were emitting 0-indexed row values.
