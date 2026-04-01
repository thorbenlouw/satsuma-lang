---
id: sl-fkwb
status: closed
deps: []
links: []
created: 2026-03-31T08:25:08Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, exploratory-testing]
---
# diff: schema note block misinterpreted as field changes

When a schema contains a note {} block and the note text changes between v1 and v2, diff misparses the note content as field-level changes instead of recognizing it as a note change.

Repro:
v1: schema data { note { This schema holds customer data. } id INT (pk) }
v2: schema data { note { This schema holds updated customer data with PII. } id INT (pk) }

Result:
  ~ data
      ~ holds: customer -> updated
      + field customer
      + field with

Expected: note text changed, no field changes.


## Notes

**2026-04-01T07:40:46Z**

**2026-03-31T12:00:00Z**

Cause: diffSchema only compared metadata-level note tag but not note blocks inside schema body. Schema body note blocks were collected by extractNotes but never diffed.
Fix: Added noteTextsForParent lookups for schemas in diffIndex and diffNoteSet calls in diffSchema. Extracted shared diffNoteSet helper.
