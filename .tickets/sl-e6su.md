---
id: sl-e6su
status: open
deps: []
links: [sl-xh3b]
created: 2026-03-21T08:01:33Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, summary, exploratory-testing]
---
# summary: incorrect pluralization for singular counts ([1 fields], [1 arrows])

The summary text output uses plural forms even when the count is 1, producing grammatically incorrect text like '[1 fields]' and '[1 arrows]'.

What I did:
  satsuma summary examples/

What I expected:
  Singular form when count is 1: [1 field], [1 arrow]

What actually happened:
  Multiple instances of '[1 fields]' in schema/metric listings:
    mfcs_json  [1 fields]
    commerce_order  [1 fields]
    monthly_recurring_revenue "MRR"  [1 fields]  grain=monthly
    churn_rate  [1 fields]  grain=monthly
    conversion_rate  [1 fields]  grain=monthly
    cart_abandonment_rate  [1 fields]  grain=daily

  Also '[1 arrows]' for mappings with a single arrow:
    sales::load orders  sales::customers → sales::orders  [1 arrows]

The '1 file' header is correctly singular, so the pluralization logic exists for files but not for fields/arrows.

Repro: satsuma summary examples/

