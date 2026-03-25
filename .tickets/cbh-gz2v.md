---
id: cbh-gz2v
status: open
deps: []
links: []
created: 2026-03-25T11:17:38Z
type: bug
priority: 2
assignee: Thorben Louw
---
# where-used: JSON output uses 0-based row numbers, inconsistent with other commands

The 'where-used --json' command outputs 0-based 'row' values, while the text output uses 1-based line numbers. Other commands (arrows --json, nl --json, nl-refs --json) all use 1-based 'line' values.

- Exact command: satsuma where-used warehouse_products /tmp/satsuma-bug-hunt/ --json
- Expected: JSON 'row' (or 'line') values should be 1-based, matching the text output and other commands
- Actual: JSON row values are 0-based (off by 1 from text output)

Examples:
  - Text output: 'product sync  /tmp/satsuma-bug-hunt/mappings.stm:6' vs JSON: '"row": 5'
  - Text output: 'order enrichment  /tmp/satsuma-bug-hunt/mappings.stm:133' vs JSON: '"row": 132'
  - Text output: 'clean email  customer onboarding  /tmp/satsuma-bug-hunt/mappings.stm:57' vs JSON: '"row": 56'

Additionally, the JSON field is named 'row' instead of 'line', unlike other commands which use 'line'.
- Test file: /tmp/satsuma-bug-hunt/

