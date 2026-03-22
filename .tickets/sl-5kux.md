---
id: sl-5kux
status: closed
deps: []
links: []
created: 2026-03-20T18:41:46Z
type: bug
priority: 3
assignee: Thorben Louw
tags: [cli, docs, bug]
---
# SATSUMA-CLI.md documents --compact as common flag but only 8 of 19 commands support it

The 'Common Flags' table in SATSUMA-CLI.md lists --compact as available on all commands. In reality only 8 commands accept it (summary, schema, metric, mapping, find, lineage, context, graph). The remaining 11 commands (where-used, warnings, arrows, fields, nl, meta, match-fields, validate, nl-refs, lint, diff) reject --compact with 'unknown option'. Either the docs should clarify which commands support it, or --compact should be added to the missing commands.

## Acceptance Criteria

1. SATSUMA-CLI.md common flags table accurately reflects which commands support --compact.
2. Alternatively, --compact is implemented on all relevant extraction commands.

## Notes

**2026-03-22T00:00:00Z**

Cause: `--compact` was listed in the "Common Flags" table implying it applies to all commands, but only 8 of 16+ commands support it.
Fix: Moved `--compact` out of the Common Flags table into a new "Per-command flags" subsection that explicitly lists the 8 commands that support it.
