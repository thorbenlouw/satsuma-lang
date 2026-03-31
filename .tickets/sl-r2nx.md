---
id: sl-r2nx
status: open
deps: []
links: []
created: 2026-03-31T08:30:03Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, namespace, import, exploratory-testing]
---
# namespace/import: directory-level validate ignores import scoping — all files in directory are merged

When running `satsuma validate <directory>`, all definitions from all files in the directory are merged into a single scope, ignoring import boundaries. Per spec section 5.3 (Import Scoping): 'a symbol is only in scope within a file if it appears in that file's import graph... Symbols that exist in the same workspace directory but are not reachable via imports are not in scope.'

Repro:
  # file1.stm defines schema alpha, maps to beta (no import of beta)
  # file2.stm defines schema beta (not imported by file1)
  cd /tmp/satsuma-test-ns-import/scoping
  satsuma validate file1.stm    # correctly warns: undefined target 'beta'
  satsuma validate .             # passes silently — merges both files

Expected: directory-level validate should still respect import scoping when imports are present. Currently, directory-level validation makes all definitions from all files visible to all other files regardless of imports.

Note: This may be intentional for backward compatibility (pre-import workspaces), but it contradicts the spec's import scoping section.

## Notes

**2026-03-31**

Re-opened. Prior triage focused on the wrong semantics. ADR-022 removes directory mode, but this ticket still captures a real boundary bug: tooling must never treat all files in a folder as a merged semantic scope. Workspace scope is file-based, and symbol reachability inside that workspace must still follow the import graph. Implementation is still needed.
