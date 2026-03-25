---
id: cbh-djny
status: closed
deps: []
links: [cbh-z5dy, cbh-ocid]
created: 2026-03-25T11:16:20Z
type: bug
priority: 2
assignee: Thorben Louw
---
# metric: filter value loses surrounding quotes in pretty-print output

DETAILED DESCRIPTION:
- Command: satsuma metric monthly_revenue /tmp/satsuma-bug-hunt/
- Expected: filter value should preserve its original quoting for round-trip fidelity:
    filter "status != 'cancelled'"
- Actual: The surrounding double quotes are stripped:
    filter status != 'cancelled'
- The source file (metrics.stm line 7) has: filter "status != 'cancelled'"
- Without quotes, the filter expression looks like bare identifiers/operators rather than a string value. If this output were copy-pasted back into a .stm file, it would not parse correctly since the filter value must be a quoted string.
- The JSON output correctly stores the value as a string: "value": "status != 'cancelled'" — so the issue is only in pretty-print rendering.
- File: /tmp/satsuma-bug-hunt/metrics.stm (monthly_revenue metric, line 7)


## Notes

**2026-03-25T12:06:20Z**

**2026-03-25T12:12:00Z**

Cause: extractMetaEntries stripped quotes from nl_string values for display, but formatMeta never re-added them, producing bare unquoted filter expressions.
Fix: Added a quoted flag to MetaEntry and made formatMeta wrap the value in double quotes when it was originally quoted in the source.
