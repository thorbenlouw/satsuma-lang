---
id: sl-vojd
status: closed
deps: []
links: [sl-x11k]
created: 2026-03-21T08:00:42Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, nl-refs, exploratory-testing]
---
# nl-refs: --json outputs text instead of empty array when no refs found

When `satsuma nl-refs` is invoked with `--json` and there are no backtick references (either because the file has none, or because `--unresolved` filters them all out), the command prints the text string 'No NL backtick references found.' instead of a valid empty JSON array `[]`.

This breaks programmatic consumers that expect valid JSON from `--json`.

What I did:
  satsuma nl-refs /tmp/satsuma-test-nl-refs/no-refs.stm --json

Expected:
  []

Actual:
  No NL backtick references found.

Same behavior with:
  satsuma nl-refs /tmp/satsuma-test-nl-refs/basic-refs.stm --unresolved --json

The bug is in tooling/satsuma-cli/src/commands/nl-refs.ts lines 58-61: the empty-result check and return happens before the JSON output branch (lines 63-66), so the text message is always printed regardless of --json.

Reproducing fixture: /tmp/satsuma-test-nl-refs/no-refs.stm


## Notes

**2026-03-22T02:00:00Z**

Cause: No-results path output plain text instead of JSON.
Fix: Output empty JSON array when --json and no refs found (commit e2ee56a).
