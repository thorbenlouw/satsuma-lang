---
id: sl-vlsh
status: closed
deps: [sl-z6z9]
links: [sl-42ev]
created: 2026-03-21T08:01:26Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, summary, exploratory-testing]
---
# summary: fieldCount excludes fields from fragment spreads

The summary command's fieldCount for a schema does not include fields contributed by fragment spreads, creating an inconsistency with the 'fields' command which does expand spreads.

What I did:
  # Created /tmp/satsuma-test-summary/imports-dir/lib.stm with fragment common_fields (2 fields)
  # Created /tmp/satsuma-test-summary/imports-dir/main.stm with schema local_schema (id, email, ...common_fields)

  satsuma summary /tmp/satsuma-test-summary/imports-dir/
  satsuma fields local_schema /tmp/satsuma-test-summary/imports-dir/

What I expected:
  summary should show local_schema [4 fields] (2 declared + 2 from spread)

What actually happened:
  summary shows: local_schema  [2 fields]
  fields shows:  id, email, created_at, updated_at (4 fields)

The summary undercounts fields when fragment spreads are used. The fields command correctly expands spreads, but summary does not include spread fields in its count.

Repro files:
  /tmp/satsuma-test-summary/imports-dir/lib.stm
  /tmp/satsuma-test-summary/imports-dir/main.stm

Commands:
  satsuma summary /tmp/satsuma-test-summary/imports-dir/
  satsuma fields local_schema /tmp/satsuma-test-summary/imports-dir/


## Notes

**2026-03-22T01:23:39Z**

Fixed by using expandEntityFields to count spread fields in summary. Added 2 integration tests.
