---
id: sl-vw49
status: open
deps: [sl-6ino]
links: [sl-wvn8]
created: 2026-03-21T08:04:56Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, nl, exploratory-testing]
---
# nl: scope resolution silently picks schema over mapping when both share a name

When a schema and a mapping have the same name, satsuma nl <name> only returns NL from the schema and silently ignores the mapping's NL content. No warning is shown about the ambiguity.

- What I did: Created /tmp/satsuma-test-nl/ambiguous-scope.stm with schema 'customers' (note "Schema note on customers") and mapping 'customers' (note "Mapping note on customers", plus an NL transform)
  Then ran: satsuma nl customers /tmp/satsuma-test-nl/ambiguous-scope.stm
- Expected: NL content from both the schema and the mapping, or at least a warning about the ambiguous scope
- Got: Only the schema's note was returned. The mapping's note and NL transform were silently dropped.
- satsuma nl all correctly shows all NL content from both.
- Root cause: extractFromBlock() in nl.ts checks schemas first via resolveIndexKey, and if found, short-circuits without checking mappings or metrics with the same name.
- Reproducer: /tmp/satsuma-test-nl/ambiguous-scope.stm

