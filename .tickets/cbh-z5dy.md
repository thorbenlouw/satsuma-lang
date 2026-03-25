---
id: cbh-z5dy
status: open
deps: []
links: []
created: 2026-03-25T11:16:16Z
type: bug
priority: 2
assignee: Thorben Louw
---
# metric --compact: strips measure metadata from fields, not just notes

DETAILED DESCRIPTION:
- Command: satsuma metric monthly_revenue /tmp/satsuma-bug-hunt/ --compact
- Help text says --compact: 'suppress note text'
- Expected: Fields should retain their (measure additive/non_additive/semi_additive) annotations since these are structural metadata, not notes. Only the note block should be suppressed.
- Actual: All field metadata is stripped. Output shows:
    total_revenue       DECIMAL(14,2)
    order_count         INT
    avg_order_value     DECIMAL(12,2)
  Instead of expected:
    total_revenue       DECIMAL(14,2) (measure additive)
    order_count         INT (measure additive)
    avg_order_value     DECIMAL(12,2) (measure non_additive)
- The measure type (additive, semi_additive, non_additive) is critical semantic metadata for metrics — it determines whether values can be summed across dimensions. Stripping it makes compact mode unusable for quick metric inspection.
- File: /tmp/satsuma-bug-hunt/metrics.stm (monthly_revenue metric, line 2)

