---
id: sl-3fvu
status: closed
deps: []
links: []
created: 2026-03-20T16:25:03Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fragment-spread]
---
#  command drops fragment spread fields

The `satsuma fields <schema>` command silently drops all fields that come from fragment spreads (`...fragmentName`). Only directly declared fields are shown.

## Acceptance Criteria

Given this input:

```stm
fragment 'audit fields' {
  created_at    TIMESTAMPTZ  (required)
  updated_at    TIMESTAMPTZ
}

schema tgt_customers {
  customer_id     UUID         (pk, required)
  email           VARCHAR(255) (format email, pii)
  ...audit fields
}
```

Running `satsuma fields tgt_customers <file>` currently outputs:

```
  customer_id  UUID
  email        VARCHAR(255)
```

Expected output should include the fragment fields:

```
  customer_id  UUID
  email        VARCHAR(255)
  created_at   TIMESTAMPTZ
  updated_at   TIMESTAMPTZ
```

The `fields` command should resolve and expand fragment spreads, inlining the fragment's fields into the output. This should work for:
- Simple spreads (`...audit fields`)
- Transitive spreads (fragments that spread other fragments)
- Namespace-qualified spreads (`...ns::fragmentName`)

The `schema` command already renders spreads verbatim (e.g., `...audit fields`), which is correct for that command. But `fields` is used by downstream tools and LLMs to get the complete field list, so it must expand spreads.

