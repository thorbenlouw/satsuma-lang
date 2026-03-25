---
id: cbh-9cqh
status: closed
deps: []
links: [cbh-ukcx, cbh-so1o, cbh-kyv3, cbh-2y8p, cbh-7ji8, cbh-b0w8, cbh-e01s, sl-kutf]
created: 2026-03-25T11:17:55Z
type: bug
priority: 2
assignee: Thorben Louw
---
# nl: field-level query misses arrow-adjacent warning comments from mappings

When querying NL for a specific field (schema.field), warning comments (//!) that are adjacent to arrows involving that field in mappings are not included in the output.

- Exact command: satsuma nl customer_master.phone /tmp/satsuma-bug-hunt/
- Expected: Should include '//! phone is not yet normalized — data quality issue' from the 'annotated arrows' mapping (mappings.stm line 252), since it directly precedes the 'phone -> contact_phone' arrow
- Actual: Only shows the field note from schema definition and the NL transform from 'customer onboarding' — the warning from 'annotated arrows' is missing

The help text says field-level NL includes 'NL on a specific field and arrows referencing it', so arrow-adjacent warning/question comments should be included.

Note: 'satsuma nl annotated arrows' correctly shows this warning, so it is extracted at the mapping level — it is just not surfaced when querying at the field level.
- Test file: /tmp/satsuma-bug-hunt/mappings.stm (line 252)

