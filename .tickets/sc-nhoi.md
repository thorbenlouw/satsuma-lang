---
id: sc-nhoi
status: closed
deps: [sc-fosy]
links: []
created: 2026-03-22T20:17:40Z
type: task
priority: 3
assignee: Thorben Louw
parent: sc-v2pn
tags: [docs]
---
# Update remaining documentation

Update PROJECT-OVERVIEW.md, FUTURE-WORK.md, and feature docs in features/ that reference old record/list/[] syntax.

## Acceptance Criteria

grep across all .md files for old patterns returns zero hits.


## Notes

**2026-03-22T20:19:03Z**

docs/ directory has 46 occurrences of old syntax across 12 files — mostly in docs/conventions-for-schema-formats/ (marc21, x12-hipaa, icalendar, cobol-copybook, asn1, hl7, swift-mt, iso20022, fix-protocol, dicom, iso8583) plus docs/data-modelling/datavault/link-inventory.stm. Also 3 tree-sitter docs (ast-mapping.md, tree-sitter-ambiguities.md, tree-sitter-precedence.md) reference [].

**2026-03-22T21:18:34Z**

**2026-03-23T00:30:00Z**

Cause: 35+ documentation files referenced old keyword-first record/list syntax and [] paths.
Fix: Updated 11 convention files, 3 tree-sitter docs, data modelling files, feature PRDs/TODOs, and excel-to-stm skill docs. All old patterns replaced with unified syntax. (commit afbcfdb)
