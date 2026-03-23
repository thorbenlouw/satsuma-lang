---
id: sl-dyqb
status: closed
deps: []
links: [sl-hyxz, sl-g1fj]
created: 2026-03-23T09:55:03Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [feature-13, parser]
---
# Parser: ref <schema> on <field> metadata syntax not supported

## Acceptance Criteria

Metadata like (ref dim_date on date_key) parses correctly. Grammar updated, corpus tests added. Data-modelling examples using this pattern parse clean.


## Notes

**2026-03-23T10:00:02Z**

Not a bug — ref X on Y is not part of v2 spec (removed). Parser supports it as a side effect of kv_ref_on rule but no action needed.
