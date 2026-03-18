---
id: stm-6gh9
status: closed
deps: []
links: []
created: 2026-03-18T20:07:56Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-q2cz
tags: [parser, grammar, feature-11]
---
# Parser gap: import declarations

The parser does not support import { ... } from "..." statements. These are clearly spec-backed (STM-V2-SPEC.md defines import syntax explicitly) and used extensively in the feature 06 examples (Kimball and Data Vault). Examples: import { address_fields } from "common.stm", import { channel_codes } from "common.stm".

## Acceptance Criteria

- import { name } from "path.stm" parses without ERROR nodes
- Multi-import import { a, b } from "path.stm" parses without ERROR nodes
- Quoted names in imports import { 'address fields' } from "lib/common.stm" parse cleanly
- Corpus test coverage added for all import forms

