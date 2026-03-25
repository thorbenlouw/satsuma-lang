---
id: cbh-5lzd
status: open
deps: []
links: [cbh-5tvk, cbh-mpz2, cbh-rkia]
created: 2026-03-25T11:17:34Z
type: bug
priority: 2
assignee: Thorben Louw
---
# find: spread fields report fragment source file/line instead of consuming schema location

When satsuma find reports fields that were included via fragment spreads, it reports the file and line number of the fragment definition rather than the schema that uses the spread.

- Exact command: satsuma find --tag pii /tmp/satsuma-bug-hunt/
- Bug 1 - Wrong file: minimal_contact is defined in edge-cases.stm (line 4-7) but the output says it's in fragments.stm
- Bug 2 - Wrong lines: vendor_contact's pii fields (email, phone, mobile) are reported at lines 18-20 (fragment definition in pii contact) instead of line 39 where the spread ...pii contact occurs in vendor_contact
- Actual output for minimal_contact:
  schema minimal_contact  (/tmp/satsuma-bug-hunt/fragments.stm)
    email  VARCHAR(255)  [pii]  line 18
    phone  VARCHAR(20)   [pii]  line 19
    mobile VARCHAR(20)   [pii]  line 20
- Expected: file should be edge-cases.stm; line numbers should reference the spread location or the consuming schema
- Test files: /tmp/satsuma-bug-hunt/edge-cases.stm (minimal_contact at line 4), /tmp/satsuma-bug-hunt/fragments.stm (pii contact fragment at line 17, vendor_contact at line 36)

