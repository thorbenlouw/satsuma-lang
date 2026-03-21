---
id: sl-d8h5
status: closed
deps: []
links: [sl-xh3b]
created: 2026-03-21T08:03:27Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, graph, exploratory-testing]
---
# graph: --no-nl flag does not strip NL text from unresolved_nl section

The --no-nl flag strips nl_text from the edges array (correct), but the unresolved_nl section retains full NL text. This contradicts the flag's purpose of reducing payload size and stripping NL content.

What I did:
  Ran: satsuma graph examples/ --json --no-nl

What I expected:
  The unresolved_nl section should either:
  a) Be omitted entirely when --no-nl is used, OR
  b) Have its text field stripped (keeping only scope, arrow, file, row)
  
  The flag's documented purpose is to 'strip NL text from edges' and 'reduce payload size'. The unresolved_nl section contains 91 entries with full NL text in the examples/ workspace.

What actually happened:
  unresolved_nl retains all 91 entries with full NL text.
  Example entry:
    {"scope": "mapping cobol customer to avro event", "arrow": "-> .number", "text": "\"Extract digits. If 10 digits assume US +1...\"" ...}

  The overall payload reduction is only about 5% (194K -> 183K) because unresolved_nl is not affected.

Reproducer: satsuma graph examples/ --json --no-nl

