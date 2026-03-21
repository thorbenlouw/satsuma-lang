---
id: sl-gu24
status: closed
deps: []
links: [sl-wvn8]
created: 2026-03-21T08:02:08Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, nl, exploratory-testing]
---
# nl: concatenated strings in note blocks only extract first string

When a note block contains multiple concatenated nl_string nodes (e.g. note { "line1" "line2" }), satsuma nl only extracts the first string and silently drops subsequent strings.

- What I did: satsuma nl cart_abandonment_rate examples/metrics.stm --json
- Expected: The note text should include both concatenated strings: "Sessions that reached checkout but did not result in a placed order, divided by all sessions that reached checkout."
- Got: Only the first string: "Sessions that reached checkout but did not result in a placed order, "
- Root cause: nl-extract.ts uses .find() on namedChildren which returns only the first matching nl_string node. Should use .filter() and concatenate all nl_string children.
- Reproducer: satsuma nl cart_abandonment_rate examples/metrics.stm --json

