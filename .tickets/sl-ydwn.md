---
id: sl-ydwn
status: open
deps: []
links: []
created: 2026-03-26T07:43:11Z
type: task
priority: 2
assignee: Thorben Louw
tags: [site, docs, feature-22]
---
# Validate site/ Satsuma examples and language claims

Audit all .stm code snippets and language feature claims on the site/ pages (index.html, examples.html, learn.html, cli.html, vscode.html). Ensure examples use current v2 syntax (backtick labels, no single quotes, name record {} not record name {}, list_of record, each/flatten instead of [], @ref in NL). Verify feature descriptions match the current spec and CLI capabilities.

## Acceptance Criteria

- All inline Satsuma snippets on site/ pages use valid v2 syntax
- No references to removed features (single-quote labels, [] array paths)
- Feature claims match current spec (SATSUMA-V2-SPEC.md) and CLI command set
- Any outdated screenshots or diagrams flagged for update

