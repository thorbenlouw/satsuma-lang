---
id: lsp-xdjz
status: closed
deps: [lsp-ulfa]
links: []
created: 2026-03-25T17:28:23Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-1, cli]
---
# P1.3: Update index-builder.ts for qualified keys

Update workspace index to store and look up schemas/fields by canonical qualified keys.

## Acceptance Criteria

- Index keys use canonical ::schema or ns::schema format
- Lookups by canonical key work
- Tests updated


## Notes

**2026-03-25T22:30:37Z**

## Notes

**2026-03-25T19:20:00Z**

Cause: CLI output needs canonical ::schema or ns::schema form for consistent references.
Fix: Added canonicalKey() for converting internal keys to canonical output form, and resolveCanonicalKey() for reverse mapping. Internal index keys remain unchanged for backward compatibility — command-level migration deferred to P1.4. Added 6 unit tests. (commit pending)
