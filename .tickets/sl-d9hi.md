---
id: sl-d9hi
status: closed
deps: []
links: [cbh-ukcx]
created: 2026-03-24T08:14:41Z
type: feature
priority: 3
assignee: Thorben Louw
tags: [cli, nl]
---
# nl text output truncates long NL strings without full-text option

The `satsuma nl` text output truncates multi-line NL transform strings with '...' and no way to see the full content. This affects both single-scope and `nl all` modes.

Examples from `satsuma nl all bug-hunt/`:
```
[transform] Parse \`PID.DateOfBirth\` which may be YYYYMMDD or YYYY-MM-DD.
     Validate that the date is not in the future.
     I...
[transform] Create telecom entry with system='phone', use='home'.
     Format as E.164 if possible using \`to_e164\`.
     Skip if ...
```

The truncated text loses important context. Users relying on `nl` to extract all NL content for interpretation will miss critical details. The `--json` output likely has full text, but the text output should either show full text by default or have a `--full` flag.

## Acceptance Criteria

1. NL text output shows complete content (at least by default for single-scope queries)
2. For `nl all`, either show full content or provide a `--full` flag
3. If truncation is needed, indicate the truncation clearly and show how to get full text


