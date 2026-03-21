---
id: sl-0o1x
status: open
deps: []
links: [sl-niix]
created: 2026-03-21T08:00:05Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lint, exploratory-testing]
---
# lint: NL-based lint rules silently skip anonymous mappings

All NL-based lint rules (hidden-source-in-nl and unresolved-nl-ref) fail silently for anonymous (unnamed) mappings.

Root cause: Anonymous mappings are indexed with key `<anon>@filepath:row` (in index-builder.ts line 206), but the NL ref extractor stores `mapping: ''` for anonymous mappings (in nl-ref-extract.ts line 202-203). When lint rules call `index.mappings.get(mappingKey)` with key `''`, no mapping is found, so:
- hidden-source-in-nl skips the mapping (line 50: `if (!mapping) continue`)
- unresolved-nl-ref proceeds with empty sources/targets, causing false positives — fields that exist in source/target schemas are reported as unresolved because the mapping context has no schema refs

Reproduction:
```bash
# File: /tmp/satsuma-test-lint/hidden-source-bare-schema.stm
# Contains an anonymous mapping with NL text referencing schema hidden_lookup
satsuma lint /tmp/satsuma-test-lint/hidden-source-bare-schema.stm --json
# Expected: hidden-source-in-nl warning for hidden_lookup
# Actual: zero findings

# Same content with named mapping fires correctly:
satsuma lint /tmp/satsuma-test-lint/hidden-source-named.stm --json
# Correctly reports: hidden-source-in-nl warning for hidden_lookup
```

Affected files:
- tooling/satsuma-cli/src/nl-ref-extract.ts (extractMappingNLRefs stores empty string for mapping name)
- tooling/satsuma-cli/src/index-builder.ts (buildWorkspaceIndex stores anon key)
- tooling/satsuma-cli/src/lint-engine.ts (lookup fails silently)

Test fixtures: /tmp/satsuma-test-lint/hidden-source-bare-schema.stm, /tmp/satsuma-test-lint/hidden-source-named.stm

