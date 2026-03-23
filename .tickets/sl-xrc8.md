---
id: sl-xrc8
status: closed
deps: []
links: []
created: 2026-03-23T12:34:19Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validate, nl-refs]
---
# Standalone note backtick refs fail to resolve against file-level schemas and fields

Backtick references inside standalone `note { }` blocks (top-level or inside schemas) do not resolve correctly, producing false `nl-ref-unresolved` and `nl-ref-not-in-source` warnings even when the referenced schemas and fields are defined in the same file.

Root cause: standalone notes get a pseudo-mapping key of `note:` (or `note:<parent>`) which has no entry in the workspace index's mappings map. When `resolveAllNLRefs()` looks up this key, it gets `undefined`, so the mapping context has empty sources/targets arrays. This means:

1. Bare field refs (e.g. \`user_id\`) cannot resolve — they need source/target schemas to search through.
2. Schema refs (e.g. \`source_system\`) resolve globally but then get flagged by `nl-ref-not-in-source` because the empty pseudo-mapping has no source/target list.
3. Dotted field refs (e.g. \`source_system.email_addr\`) resolve via the global fallback but also get the false `not-in-source` warning.

Reproduces on the canonical `examples/db-to-db.stm` where \`tax_encryption_key\` in the top-level note is reported as unresolved.

## Acceptance Criteria

- Backtick refs in standalone notes that reference schemas defined in the same file resolve without warnings
- Backtick refs in standalone notes that reference fields of schemas in the same file resolve without warnings (bare refs should search all file-level schemas)
- The `nl-ref-not-in-source` rule is either skipped or adapted for standalone notes (they have no mapping context)
- `satsuma validate examples/db-to-db.stm` no longer warns about \`tax_encryption_key\` as unresolved (this one is a non-schema ref, so it should either resolve or the note context should suppress the warning)
- Existing mapping-scoped NL ref validation is unchanged
- Tests added covering standalone note ref resolution

## Notes

**2026-03-23T12:40:00Z**

Cause: Standalone `note { }` blocks get a pseudo-mapping key `"note:"` with no entry in the workspace index, so bare field refs have no schemas to search and all resolved refs get false `not-in-source` warnings.
Fix: (1) In `resolveRef()`, added fallback for bare refs to search all workspace schemas when sources/targets are empty. (2) In `validate.ts`, skip both `nl-ref-unresolved` and `nl-ref-not-in-source` diagnostics for note-context entries (`mappingKey.startsWith("note:")`). Added 8 new unit tests.
