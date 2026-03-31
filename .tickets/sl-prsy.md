---
id: sl-prsy
status: open
deps: []
links: []
created: 2026-03-31T08:28:42Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, primitives, exploratory-testing]
---
# nl: parent field in JSON output uses bare field name instead of schema-qualified path

When 'satsuma nl' returns NL from field-level notes (e.g. (note "...") on a field), the JSON 'parent' field shows only the bare field name (e.g. "email") rather than the schema-qualified path (e.g. "alpha.email").

Reproduction:
  Create two schemas with same field name having different notes:
    schema alpha { email STRING (note "Alpha email") }
    schema beta { email STRING (note "Beta email") }
  satsuma nl all /tmp/test/ --json
  # Both items show parent: "email" — ambiguous, cannot determine which schema

Expected: parent should be "alpha.email" and "beta.email" respectively, matching the schema.field path convention used elsewhere in the CLI.

Impact: When processing nl --json output programmatically (e.g. PII audit workflow), consumers cannot reliably associate field-level NL with the correct schema without cross-referencing line numbers.

