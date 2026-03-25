---
id: cbh-s9w6
status: open
deps: []
links: [cbh-fmtb, cbh-7rvo, cbh-gz2v, cbh-myj2]
created: 2026-03-25T11:18:29Z
type: bug
priority: 2
assignee: Thorben Louw
---
# warnings: JSON row numbers are 0-indexed while human output uses 1-indexed line numbers

The warnings command returns inconsistent line numbering between JSON and human output formats.

- Exact command: satsuma warnings /tmp/satsuma-bug-hunt/warnings.stm --json
- Expected: JSON 'row' field should use 1-indexed line numbers matching the human-readable output and standard conventions
- Actual: JSON uses 0-indexed row numbers (row: 4 for file line 5, row: 6 for file line 7, etc.) while human output uses 1-indexed (correctly shows :5, :7, etc.)
- Example discrepancy:
  - warnings.stm line 5: '//! Data type mismatch...' -- human shows ':5', JSON shows row:4
  - warnings.stm line 22: '//! This mapping is incomplete...' -- human shows ':22', JSON shows row:21
  - mappings.stm line 252: '//! phone is not yet normalized...' -- human shows ':252', JSON shows row:251
- This off-by-one affects all items in the JSON output across all files
- Test file: /tmp/satsuma-bug-hunt/warnings.stm

