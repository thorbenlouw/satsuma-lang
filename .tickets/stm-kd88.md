---
id: stm-kd88
status: closed
deps: []
links: []
created: 2026-03-19T08:35:47Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [parser, validate]
---
# stm validate: false-positive warnings and parse errors on valid syntax

stm validate produces false positives and incorrect parse errors on spec-valid syntax. Found when validating features/06-data-modelling-with-stm/ examples.

## Acceptance Criteria

1. Triple-quoted strings (""") inside metadata () blocks parse without errors
   - e.g. `note """..."""` inside a schema's metadata parens
   - Affected: link-inventory.stm:47, link-sale.stm:67

2. Inner double quotes inside triple-quoted strings (""") do not cause parse errors
   - Per spec section 2.2: "No escaping needed for inner double quotes"
   - e.g. `This supports "as-of" queries: "Which warehouses..."`
   - Affected: link-inventory.stm:14-15

3. Cross-file import resolution works for field-not-in-schema validation
   - Fields declared in a schema should be found even when the schema is
     redeclared in another file or imported via `import { } from`
   - Affected: ~30 false-positive warnings about pos_oracle, ecom_shopify fields

4. Inferred fields from Data Vault vocabulary tokens (hub, satellite, link)
   are not flagged as missing
   - record_source, load_date, load_end_date, *_hk hash keys are inferred
   - Affected: ~20 false-positive warnings across all DV examples


## Notes

**2026-03-19T08:36:52Z**

Split into four atomic tickets: stm-503w, stm-v9yc, stm-gde5, stm-pxl6
