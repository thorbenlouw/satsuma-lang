---
id: sl-rs0e
status: closed
deps: []
links: []
created: 2026-03-28T18:36:26Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [cli, lineage, field-lineage, feature, agent-ux]
---
# feature: field-lineage subcommand — trace a single field left and right through the graph

There is currently no way to trace the full lineage of a single field in one command. To trace field s2.a left (upstream) and right (downstream) requires:
  1. satsuma arrows s2.a --as-source → get immediate downstream targets
  2. For each target field, repeat arrows --as-source
  3. satsuma arrows s2.a → get inbound arrows (source field refs)
  4. For each source field, repeat

This multi-step graph walk is error-prone for agents and humans alike. A dedicated subcommand would make field-level lineage first-class.

Proposed interface:
  satsuma field-lineage s2.a            # full upstream + downstream
  satsuma field-lineage s2.a --upstream # only upstream chain
  satsuma field-lineage s2.a --downstream # only downstream chain
  satsuma field-lineage s2.a --json     # structured output

Proposed JSON output:
  {
    "field": "::s2.a",
    "upstream": [
      { "field": "::s1.a", "via_mapping": "::m1", "classification": "none" },
      ...
    ],
    "downstream": [
      { "field": "::s3.a", "via_mapping": "::m2", "classification": "none" },
      ...
    ]
  }

This enables one-shot field lineage for agents doing impact analysis, PII audits, and coverage checks without having to compose multiple arrows calls.

## Acceptance Criteria

- satsuma field-lineage <schema.field> returns upstream and downstream field chains
- --upstream / --downstream flags filter to one direction
- --json returns structured output as described
- Depth-limited to avoid runaway traversal on large graphs (inherits --depth)
- Works with namespaced fields (ns::schema.field)
- Handles cycles gracefully (marks revisited fields as already-seen)
- Works for fields reachable via each/flatten (dot-path fields)
- Documented in SATSUMA-CLI.md
- Integration tests added to smoke-tests/arrows/

## Notes

**2026-03-29**

Cause: No field-lineage command existed; agents had to compose multiple `arrows` calls to trace upstream/downstream chains.
Fix: Implemented `satsuma field-lineage <schema.field>` in `tooling/satsuma-cli/src/commands/field-lineage.ts`. Builds a field-edge graph from both declared arrows (`index.fieldArrows`) and nl-derived references (`resolveAllNLRefs`), then BFS-traverses for upstream/downstream. Supports `--upstream`, `--downstream`, `--depth`, `--json`, namespace-qualified fields, and cycle detection. Documented in `SATSUMA-CLI.md`. Smoke tests added to `test_arrows.py` (test_01, test_02, test_05 field-lineage cases). (commit pending)
