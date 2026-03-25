---
id: cbh-h0or
status: open
deps: []
links: [cbh-cyl0, cbh-y5og, cbh-n4vm, cbh-sttt]
created: 2026-03-25T11:24:14Z
type: epic
priority: 1
assignee: Thorben Louw
---
# NL backtick reference handling bugs

NL backtick references are mishandled in several commands: lineage creates phantom edges, arrows prefixes source schema incorrectly, nl-refs misattributes metric refs as mappings. These likely share root cause in the NL-ref resolution layer.

