---
id: sl-n11t
status: open
deps: []
links: [sl-6hot]
created: 2026-03-21T08:03:18Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, graph, exploratory-testing]
---
# graph: schema_edges includes NL-referenced schemas as sources (hidden-source leak)

The graph schema_edges (and --compact output) incorrectly adds schemas referenced in NL text as source entries, even when those schemas are not declared in the mapping's source block. This is a leak from the hidden-source-in-nl lint detection into graph construction — the graph should reflect declared structural facts only.

What I did:
  Created /tmp/satsuma-test-graph/complex/mappings.stm with:
    mapping 'build dim_customer' {
      source { `crm_accounts`, `erp_customers` }
      target { `dim_customer` }
      ...
      -> signup_date { "Earliest date from `crm_accounts` or `web_profiles`" }
    }
  Note: web_profiles is NOT in the source declaration.

  Ran: satsuma graph /tmp/satsuma-test-graph/complex/ --json

What I expected:
  schema_edges should only contain:
    crm_accounts -> build dim_customer [source]
    erp_customers -> build dim_customer [source]

What actually happened:
  schema_edges also contains:
    web_profiles -> build dim_customer [source]
  
  The lint command correctly flags this as hidden-source-in-nl (a warning), but the graph should not promote NL references to structural source declarations.

  The --compact output also shows: web_profiles -> build dim_customer  [source]

Reproducer: /tmp/satsuma-test-graph/complex/mappings.stm

