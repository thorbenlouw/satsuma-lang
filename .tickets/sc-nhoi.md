---
id: sc-nhoi
status: open
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
