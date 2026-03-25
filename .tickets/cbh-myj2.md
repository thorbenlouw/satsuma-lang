---
id: cbh-myj2
status: open
deps: []
links: []
created: 2026-03-25T11:20:43Z
type: bug
priority: 2
assignee: Thorben Louw
---
# validate --json: bare array output inconsistent with lint --json structure

validate --json returns a bare JSON array of findings, while lint --json returns a structured object with {findings, fixes, summary}. This inconsistency means downstream consumers need different parsers for structurally similar commands.

- Exact command: satsuma validate /tmp/satsuma-bug-hunt/ --json
- Expected: Consistent JSON structure with lint, e.g., {"findings": [...], "summary": {"files": 7, "errors": 0, "warnings": 5}}
- Actual: Returns bare array: [{"file": ..., "severity": "warning", ...}, ...]
- Compare with: satsuma lint /tmp/satsuma-bug-hunt/ --json which returns {"findings": [...], "fixes": [], "summary": {"files": 7, "findings": 5, "fixable": 3, "fixed": 0}}
- Test file path: /tmp/satsuma-bug-hunt/

