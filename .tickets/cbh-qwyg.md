---
id: cbh-qwyg
status: open
deps: []
links: [cbh-zybb, cbh-xj0m, cbh-vgka, cbh-0lhj, cbh-394k, cbh-ya9k]
created: 2026-03-25T11:20:30Z
type: bug
priority: 2
assignee: Thorben Louw
---
# fmt: collapses multi-line field metadata into single line

The formatter collapses multi-line field metadata annotations into a single line, reducing readability for fields with many attributes.

- Exact command: cat /tmp/satsuma-bug-hunt/schemas.stm | satsuma fmt --stdin
- Expected: Multi-line metadata like:
  email VARCHAR(255) (
    format email,
    pii,
    unique,
    note "Validated against RFC 5322..."
  )
  should remain multi-line (or at least respect a line-length threshold)
- Actual: Collapsed to single line: email VARCHAR(255) (format email, pii, unique, note "Validated against RFC 5322. Bounced emails set to null after 3 bounces.")
- This affects the customer_master schema email and phone fields in schemas.stm
- Test file path: /tmp/satsuma-bug-hunt/schemas.stm

