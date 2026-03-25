---
id: lsp-upfx
status: open
deps: []
links: []
created: 2026-03-25T17:28:11Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-1, cli]
---
# P1.1: Create canonicalRef() utility

Create shared canonicalRef(namespace, schema, field?) utility in tooling/satsuma-cli/src/canonical-ref.ts. Produces [ns]::schema.field form for all CLI output.

## Acceptance Criteria

- canonicalRef() returns ::schema.field when no namespace
- canonicalRef() returns namespace::schema.field when namespace present
- Unit tests cover both cases plus edge cases (empty field, special chars)
- Exported from a new canonical-ref.ts module

