---
id: sl-vjvf
status: open
deps: []
links: []
created: 2026-03-31T08:27:39Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lint, validate, exploratory-testing]
---
# validate/lint: unresolved @ref in file-level and schema-level note blocks not detected

Neither validate nor lint catches unresolved @ref references in file-level note blocks or schema-level (note "...") metadata. Only @refs inside mapping bodies are checked.

Repro:
```bash
cat > /tmp/test-note.stm << 'EOF'
note { "See @completely_nonexistent for details" }
schema my_schema (note "Derived from @nonexistent_upstream") { id INT (pk) }
EOF
satsuma validate /tmp/test-note.stm --json  # findings: []
satsuma lint /tmp/test-note.stm --json      # findings: []
```

Expected: At least an unresolved-nl-ref warning for @completely_nonexistent and @nonexistent_upstream since neither resolves to any known identifier.

Note: @refs in metric note blocks ARE checked (confirmed working), so the gap is specifically in file-level note blocks and schema/field-level (note "...") metadata.

