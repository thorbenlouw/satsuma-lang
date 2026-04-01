---
id: sl-vjvf
status: closed
deps: []
links: []
created: 2026-03-31T08:27:39Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lint, validate, exploratory-testing]
---
# validate/lint: unresolved @ref in file-level and schema-level note blocks not detected

Neither validate nor lint catches unresolved @ref references in file-level note blocks or schema-level (note "...") metadata. Only @refs inside mapping bodies are checked.

Repro:
```bash
cat > /tmp/test-note.stm << 'EOF'
note { "See @completely_nonexistent for details" }
schema my_schema (note "Derived from @nonexistent_upstream") { id INT (pk) }
EOF
satsuma validate /tmp/test-note.stm --json  # findings: []
satsuma lint /tmp/test-note.stm --json      # findings: []
```

Expected: At least an unresolved-nl-ref warning for @completely_nonexistent and @nonexistent_upstream since neither resolves to any known identifier.

Note: @refs in metric note blocks ARE checked (confirmed working), so the gap is specifically in file-level note blocks and schema/field-level (note "...") metadata.

## Notes

**2026-04-01**

Cause (file-level notes): Both `checkNLRefs` (validate) and `checkUnresolvedNlRef` (lint) had an explicit `if (item.mapping === "note:") continue;` guard that skipped file-level notes entirely. This was the fix for sl-vrsu (false positives on backtick emphasis) but it also suppressed genuine `@ref` warnings.
Cause (inline metadata): `extractBlockNoteRefs` in nl-ref.ts only scanned `note_block` child nodes, missing the `metadata_block > note_tag` path that represents inline `(note "...")` in schema/metric declarations.
Fix: Removed the `note:` guard from both validate and lint. Added scanning of `metadata_block > note_tag` in `extractBlockNoteRefs`. Updated sl-vrsu-era test in lint-engine.test.ts to document the new behaviour. (commit 9f55a7b)
