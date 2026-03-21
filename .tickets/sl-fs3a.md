---
id: sl-fs3a
status: open
deps: []
links: [sl-0ycs]
created: 2026-03-21T07:59:24Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, arrows, exploratory-testing]
---
# arrows: exit code 0 when no arrows found instead of documented exit code 1

The arrows command returns exit code 0 when no arrows are found for a valid field, but SATSUMA-CLI.md documents exit code 1 for 'Not found or no results'.

This affects three scenarios:
1. A field exists in a schema but has no arrows at all
2. A field has arrows but --as-source/--as-target filters them all out
3. A list/record parent field used in a nested arrow (tags[] -> labels[]) returns 'No arrows found'

What I did:
  satsuma arrows source_sys.name --as-target /tmp/satsuma-test-arrows/all-arrows.stm; echo $?
  satsuma arrows target_sys.display_name --as-source /tmp/satsuma-test-arrows/all-arrows.stm; echo $?
  satsuma arrows source_sys.tags /tmp/satsuma-test-arrows/all-arrows.stm; echo $?

What I expected:
  Exit code 1 in all cases (no results)

What actually happened:
  Exit code 0 in all cases

The code at arrows.ts line 116 explicitly does process.exit(0) when arrows.length === 0.

Note: Tickets sl-cthr and sl-u0ev report the same pattern for 'warnings' and 'context' commands. This is the same class of bug in the arrows command.

Reproducer file: /tmp/satsuma-test-arrows/all-arrows.stm

