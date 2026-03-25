---
id: cbh-ukcx
status: open
deps: []
links: [cbh-so1o, cbh-kyv3, cbh-2y8p, cbh-7ji8, cbh-9cqh, cbh-b0w8, cbh-e01s, sl-d9hi]
created: 2026-03-25T11:24:02Z
type: epic
priority: 1
assignee: Thorben Louw
---
# Note/NL extraction gaps across commands

Multiple commands fail to extract or display note blocks and NL content. These likely share a common root cause in how note blocks are traversed in the index builder or extraction layer.

Covers: mapping JSON missing notes, meta missing mapping/metric notes, nl missing source-block join text, nl field-level missing adjacent comments, meta truncating schema notes, summary note formatting.

