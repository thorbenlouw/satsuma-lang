---
id: sl-kh05
status: closed
deps: []
links: []
created: 2026-03-31T08:23:46Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, parser, exploratory-testing]
---
# parser-edge: most reserved keywords accepted as bare identifiers contrary to spec

The spec (section 2.6) states: 'These keywords introduce structural blocks and cannot be used as bare identifiers: schema, fragment, mapping, transform, metric, source, target, map, record, list_of, each, flatten, note, import.'

However, testing shows that nearly all of these work as both schema names and field names. Only 'note' is rejected as a field name. All others — including schema, fragment, mapping, transform, metric, source, target, map, record, list_of, each, flatten, import — are accepted as bare identifiers in both schema-name and field-name positions.

Repro (keyword as schema name):
  echo 'schema schema { id INT }' > /tmp/test.stm && npx satsuma validate /tmp/test.stm
  # Expected: error. Actual: clean.

Repro (keyword as field name):
  echo 'schema test { source STRING }' > /tmp/test.stm && npx satsuma validate /tmp/test.stm
  # Expected: error. Actual: clean.
  echo 'schema test { record STRING }' > /tmp/test.stm && npx satsuma validate /tmp/test.stm
  # Expected: error. Actual: clean.

Only 'note' as a field name triggers a parse error, because the grammar interprets it as the start of a note block inside a schema body.

Either the grammar should be tightened to reject reserved keywords as bare identifiers, or the spec should be relaxed. The current behavior is inconsistent with the documented contract.

Fixture: /tmp/satsuma-test-parser-edge/15b-keywords-as-fields.stm, kw-*.stm, fkw-*.stm

## Notes

**2026-04-01T21:00:00Z**

Cause: The spec (section 2.6) stated keywords "cannot be used as bare identifiers" but the grammar only enforces this for `note` (which starts a note block inside schema body). All other keywords are freely accepted as identifiers.
Fix: Updated spec section 2.6 to accurately document current parser behavior — keywords are "strongly discouraged" as identifiers rather than "cannot be used". Added a parser enforcement note explaining the distinction. Tightening the grammar to reject all keywords was judged too risky (potential corpus breakage) relative to the benefit; a future ADR can revisit if strict enforcement is desired.
