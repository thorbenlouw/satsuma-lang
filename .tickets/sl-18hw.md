---
id: sl-18hw
status: closed
deps: [sl-ck20]
links: [sl-cyen, sl-van1]
created: 2026-03-21T08:01:14Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, diff, exploratory-testing]
---
# diff: note block changes are not detected

Top-level note blocks (added, removed, or modified) are completely invisible to the diff command.

What I did:
  satsuma diff /tmp/satsuma-test-diff/a_notes.stm /tmp/satsuma-test-diff/b_notes_changed.stm
  satsuma diff /tmp/satsuma-test-diff/a_notes.stm /tmp/satsuma-test-diff/b_notes_added.stm
  satsuma diff /tmp/satsuma-test-diff/a_base.stm /tmp/satsuma-test-diff/b_changed_notes.stm

In a_notes.stm:
  note { "This is the original integration context" }
In b_notes_changed.stm:
  note { "This is the UPDATED integration context" }
In b_notes_added.stm:
  adds a second note block

Expected: Diff should report note block additions and content changes.
Actual: All report 'No structural differences.'

Note blocks are structural content in the Satsuma language (not comments). They carry documentation context that is meaningful for change review workflows described in the CLI docs (satsuma diff is recommended for 'reviewing a change').

Root cause: The diff command only compares schemas and mappings. WorkspaceIndex stores warnings and questions arrays but does not have a dedicated notes collection, and diff.ts does not attempt to compare note blocks.

Reproduction files:
  /tmp/satsuma-test-diff/a_notes.stm vs /tmp/satsuma-test-diff/b_notes_changed.stm
  /tmp/satsuma-test-diff/a_notes.stm vs /tmp/satsuma-test-diff/b_notes_added.stm


## Notes

**2026-03-22T00:52:35Z**

Added NoteRecord type, extractNotes function, note diffing via set comparison. Notes are now extracted into WorkspaceIndex and compared by diff. All output modes (default, --stat, --json) show note additions/removals. Added 3 integration tests. All 584 tests pass.
