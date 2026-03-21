---
id: sl-6gta
status: open
deps: [sl-ck20]
links: [sl-cyen]
created: 2026-03-21T08:00:47Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, diff, exploratory-testing]
---
# diff: field metadata changes are not detected

The diff command does not detect changes to field-level metadata. When a field gains or loses metadata tags (like required, pii, unique, format, enum, note, etc.), the diff reports no structural differences.

What I did:
  satsuma diff /tmp/satsuma-test-diff/a_base.stm /tmp/satsuma-test-diff/b_changed_metadata.stm

The a_base.stm file has:
  name     STRING(200)
  email    STRING(255) (pii)

The b_changed_metadata.stm file has:
  name     STRING(200) (required)
  email    STRING(255) (pii, required)

Expected: Diff should report metadata changes on 'name' (added 'required') and 'email' (added 'required').
Actual: 'No structural differences.'

This also extends to schema-level metadata:
  satsuma diff /tmp/satsuma-test-diff/a_schema_meta.stm /tmp/satsuma-test-diff/b_schema_meta_changed.stm
  (schema note changed from 'Original customer schema' to 'Updated customer schema description')
  Result: 'No structural differences.'

Root cause: diffSchema() in tooling/satsuma-cli/src/diff.ts line 56-80 only compares field names and types (field.type !== bFields.get(name)!.type). It never compares metadata. The SchemaChange type only has kinds: field-removed, field-added, type-changed — there is no metadata-changed kind.

Reproduction files:
  /tmp/satsuma-test-diff/a_base.stm vs /tmp/satsuma-test-diff/b_changed_metadata.stm
  /tmp/satsuma-test-diff/a_schema_meta.stm vs /tmp/satsuma-test-diff/b_schema_meta_changed.stm

