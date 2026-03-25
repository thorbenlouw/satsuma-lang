---
id: sl-kutf
status: closed
deps: []
links: [cbh-so1o, cbh-9cqh]
created: 2026-03-24T08:18:27Z
type: feature
priority: 3
assignee: Thorben Louw
tags: [cli, nl]
---
# nl command does not support deeply nested field paths as scope

The `nl` command accepts `schema.field` as a scope but fails for deeper paths like `pacs008.CdtTrfTxInf.PmtId`. This is inconsistent with the `meta` command which supports deeply nested paths.

Repro:
```bash
satsuma nl pacs008.CdtTrfTxInf.PmtId bug-hunt/
# Error: Field 'CdtTrfTxInf.PmtId' not found in schema 'pacs008'

# But meta works:
satsuma meta pacs008.CdtTrfTxInf.PmtId.UETR bug-hunt/
# Works! Shows type, xpath, note
```

For deeply nested schemas (XML, HL7), users need to query NL content at specific nested scopes.

## Acceptance Criteria

1. `nl` supports multi-level nested paths (e.g. `schema.record.nested_record`)
2. Returns NL content (notes, comments) within the specified nested scope
3. Consistent with the path support in the `meta` command


