---
id: sl-vexa
status: closed
deps: []
links: [sl-m4l5]
created: 2026-03-21T07:59:14Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, match-fields, exploratory-testing]
---
# match-fields: --json output ignores --matched-only and --unmatched-only filters

The --json flag is checked before --matched-only and --unmatched-only in match-fields.ts (line 69). When --json is set, the full unfiltered result is always emitted, ignoring both filter flags.

What I did:
  satsuma match-fields --source large_source --target large_target --matched-only --json /tmp/satsuma-test-match-fields/large-schema.stm
  satsuma match-fields --source large_source --target large_target --unmatched-only --json /tmp/satsuma-test-match-fields/large-schema.stm

What I expected:
  --matched-only --json should omit sourceOnly and targetOnly arrays (or make them empty)
  --unmatched-only --json should omit matched array (or make it empty)

What actually happened:
  Both commands output the full result with all 20 matched items, 3 sourceOnly, and 2 targetOnly — the filter flags are completely ignored.

Root cause: In match-fields.ts, the opts.json check at line 69 returns early before the matchedOnly/unmatchedOnly checks at lines 74 and 85.

Reproducer: /tmp/satsuma-test-match-fields/large-schema.stm


## Notes

**2026-03-22T02:00:00Z**

Cause: --json output path returned early before applying filter logic.
Fix: Apply filter logic before JSON serialization (commit eb4c842).
