---
id: sl-ivel
status: closed
deps: []
links: [sl-0ycs]
created: 2026-03-21T08:01:17Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, nl-refs, exploratory-testing]
---
# nl-refs: exits with code 0 instead of 1 when no refs found

The `satsuma nl-refs` command exits with code 0 when no backtick references are found. According to the documented exit code contract in SATSUMA-CLI.md, exit code 1 means 'Not found or no results'. This is inconsistent with the documented behavior.

What I did:
  satsuma nl-refs /tmp/satsuma-test-nl-refs/no-refs.stm; echo $?

Expected: exit code 1 (no results)
Actual: exit code 0

This also applies when --unresolved filters all refs out:
  satsuma nl-refs /tmp/satsuma-test-nl-refs/basic-refs.stm --unresolved; echo $?
  # Exits with 0 even though no unresolved refs matched

The bug is in tooling/satsuma-cli/src/commands/nl-refs.ts lines 58-61 — the empty-result branch just returns without calling process.exit(1).

Reproducing fixture: /tmp/satsuma-test-nl-refs/no-refs.stm

