---
id: sl-yibt
status: open
deps: []
links: []
created: 2026-03-21T08:06:25Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, graph, exploratory-testing]
---
# graph: fragment nodes have empty fields array

Fragment nodes in the graph --json output always have an empty fields array, even though fragments define fields that are spread into schemas.

What I did:
  Ran: satsuma graph examples/ --json

  Checked all fragment nodes:
    Fragment 'address fields': 0 fields (should have 6: line1, line2, city, state, postal_code, country)
    Fragment 'audit columns': 0 fields (should have 4: created_at, created_by, updated_at, updated_by)
    Fragment 'standard_metadata': 0 fields (should have 3: load_ts, record_source, batch_id)
    All 8 fragments show 0 fields.

What I expected:
  Fragment nodes should include their field definitions in the fields array, similar to how schema nodes include fields. This would allow consumers to understand what fields a fragment contributes when it's spread into a schema.

What actually happened:
  All fragment nodes have: "fields": [] or no fields array at all.
  Example fragment definition in common.stm:
    fragment 'address fields' {
      line1        STRING(200)    (required)
      line2        STRING(200)
      city         STRING(100)    (required)
      state        STRING(50)
      postal_code  STRING(20)     (required)
      country      STRING(2)
    }
  But graph reports this fragment with no fields.

Reproducer: satsuma graph examples/ --json | python3 -c "import json,sys; [print(n['id'], n.get('fields',[])) for n in json.load(sys.stdin)['nodes'] if n['kind']=='fragment']"

