---
id: stm-ekgq
status: open
deps: []
links: []
created: 2026-03-18T20:08:02Z
type: task
priority: 3
assignee: Thorben Louw
parent: stm-q2cz
tags: [parser, grammar, feature-11]
---
# Parser gap: ref with on join clause in schema metadata

Feature 06 Kimball examples use 'ref dim_X on field' inside schema metadata to declare foreign-key joins. The parser does not support the 'on <field>' clause after a ref metadata value. Examples: ref dim_customer on customer_id, ref dim_product on sku. This construct is example-backed only (feature 06) and not yet in spec prose — needs a spec decision before parser work.

## Acceptance Criteria

- Decision made on whether ref...on is spec-worthy
- If yes: corpus test for 'ref dim_customer on customer_id' in schema metadata
- If yes: grammar extended to support 'ref <ident> on <ident>' form
- If no: feature 06 examples normalized to use existing metadata forms

