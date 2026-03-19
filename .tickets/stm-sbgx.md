---
id: stm-sbgx
status: closed
deps: []
links: []
created: 2026-03-19T12:03:34Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [cli, namespaces]
---
# arrows command ignores schema qualifier in namespace-qualified field paths

The `stm arrows` command matches on bare field name only, ignoring the schema (and namespace) qualifier. This means `stm arrows 'raw::crm_contacts.email'` and `stm arrows 'mart::dim_contact.email'` return identical results — every arrow in the workspace involving any field named `email`, regardless of which schema it belongs to.

Additionally, the JSON output shows `"target": "?.email"` instead of resolving to the actual target schema name.

The arrow count summary is also wrong: it reports counts that don't add up (e.g., '2 arrows (1 as source, 2 as target)' when there are only 1 source and 1 target arrow).

## Acceptance Criteria

1. `stm arrows 'raw::crm_contacts.email' examples/ns-platform.stm` returns ONLY arrows where `raw::crm_contacts` is the source or target schema — not arrows from unrelated schemas that happen to have a field named `email`.
2. `stm arrows 'mart::dim_contact.email' examples/ns-platform.stm` returns a different result set scoped to `mart::dim_contact`.
3. JSON output shows the resolved target schema name (e.g., `"target": "vault::sat_contact_details.email"`) instead of `"?.email"`.
4. The arrow count summary is arithmetically correct (source count + target count = total).
5. Unqualified field paths (e.g., `crm_contacts.email`) still work by matching the base schema name.

