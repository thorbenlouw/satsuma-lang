---
id: sc-aij8
status: closed
deps: [sc-c09h]
links: [sc-81p5, sc-gokg, sc-mbc5, sc-akx6, sc-jais]
created: 2026-03-19T18:44:04Z
type: feature
priority: 1
assignee: Thorben Louw
tags: [stm-cli, nl-refs]
---
# New subcommand: stm nl-refs — extract backtick references from NL blocks

Add a new stm subcommand that extracts and lists all backtick-delimited references from NL blocks. Scope can be a file, directory, or specific mapping/schema. Output should show each reference with its classification (schema, field, namespace-qualified), the containing block, and source location. Supports --json for structured output. This is the user-facing counterpart to the internal extraction utility.

## Acceptance Criteria

- stm nl-refs [path] lists all backtick refs found in NL blocks
- Each ref shows: reference text, classification, containing block (mapping/schema name), file, line
- Supports scoping to a single mapping or schema (e.g. stm nl-refs --mapping 'stage gl entries')
- --json flag for structured output
- --unresolved flag to show only refs that don't resolve to known identifiers
- Human-readable table output by default
- Tests with ns-merging.stm and other example fixtures

