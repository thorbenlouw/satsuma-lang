---
id: sl-ltv6
status: open
deps: []
links: []
created: 2026-03-31T08:29:10Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, namespace, import, exploratory-testing]
---
# namespace/import: arrows text header shows '0 arrows' when queried with bare (unqualified) name

When using `satsuma arrows <bare_name>.<field>` on a namespaced schema, the text header shows '0 arrows ()' while the body correctly lists the matching arrows. Using the fully qualified name (e.g., `crm::customers.customer_id`) shows the correct count '2 arrows (2 as source)'. The JSON output is correct in both cases — the bug is text-mode only.

Repro:
  cd /tmp/satsuma-test-ns-import/basic-only
  satsuma arrows customers.name   # shows 'customers.name — 0 arrows ()'
  satsuma arrows crm::customers.name  # shows 'crm::customers.name — 1 arrow (1 as source)'

Both show the same arrow in the body.

