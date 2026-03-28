---
id: sl-hy8w
status: open
deps: []
links: []
created: 2026-03-28T18:35:46Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [cli, arrows, namespaces, lineage]
---
# bug: arrows command cannot query by source field in cross-namespace mappings

When a mapping at global scope uses a namespaced schema as its source (e.g. source { src::s1 }), querying arrows by the source field fails with "Field not found", even though the field exists and the same arrow is visible when queried by the target field.

Example fixture:
  namespace src { schema s1 { a x } }
  namespace tgt { schema s2 { b x } }
  mapping m { source { src::s1 } target { tgt::s2 }  a -> b }

Observed:
  satsuma arrows src::s1.a  →  "Field 'a' not found in schema 'src::s1'"  (exit 1)
  satsuma arrows tgt::s2.b  →  correctly returns arrow with source="src::s1.a"

Expected:
  satsuma arrows src::s1.a  →  returns the arrow with source="src::s1.a", target="tgt::s2.b"

The asymmetry means field lineage can only be traced right-to-left (target → source) for cross-namespace mappings; forward tracing (source → target) is broken.

## Acceptance Criteria

- satsuma arrows src::s1.a returns the cross-namespace arrow correctly
- Forward and reverse field-level queries are symmetric for cross-namespace mappings
- Smoke test test_06_cross_ns_source_side_fails updated to expect exit 0 and assert the arrow

