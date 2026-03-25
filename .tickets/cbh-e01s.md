---
id: cbh-e01s
status: closed
deps: []
links: [cbh-ukcx, cbh-so1o, cbh-kyv3, cbh-2y8p, cbh-7ji8, cbh-9cqh, cbh-b0w8]
created: 2026-03-25T11:16:33Z
type: bug
priority: 2
assignee: Thorben Louw
---
# mapping --json: note field missing from JSON output

DETAILED DESCRIPTION:
- Command: satsuma mapping 'customer onboarding' /tmp/satsuma-bug-hunt/ --json
- Also affects: satsuma mapping 'empty mapping' /tmp/satsuma-bug-hunt/ --json
- Expected: JSON output should include a 'note' field when the mapping has a note block, similar to how schema --json and metric --json include notes
- Actual: The JSON output has no 'note' key at all. Verified with:
    python3 -c "import sys,json; d=json.load(sys.stdin); print('note' in d)"  => False
- The customer onboarding mapping has a substantial multi-line note (lines 37-48 in mappings.stm) documenting pipeline rules and NULL handling.
- The empty mapping has a note that is the only content in the mapping body.
- In both cases, the note is shown in default output as 'note { ... }' but completely absent from JSON.
- Compare: metric --json DOES include the note field. schema --json DOES include the note field. mapping --json does NOT.
- File: /tmp/satsuma-bug-hunt/mappings.stm (customer onboarding line 35, empty mapping in edge-cases.stm line 62)


## Notes

**2026-03-25T11:45:09Z**

**2026-03-25T11:45:00Z**

Cause: The mapping command's printJson function collected metadata_block entries but never looked for note_block children of mapping_body.
Fix: Added extractNoteText helper to mapping.ts and included the note field in the JSON output object (conditionally, only when a note block exists).
