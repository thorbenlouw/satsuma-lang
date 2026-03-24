---
id: sl-tl4h
status: closed
deps: []
links: []
created: 2026-03-24T08:18:16Z
type: bug
priority: 3
assignee: Thorben Louw
tags: [cli, lint]
---
# unresolved-nl-ref false positive for backticked transform function names

When NL text backticks a known Satsuma transform function name like \`to_e164\`, \`to_iso8601\`, \`to_utc\`, etc., the `unresolved-nl-ref` lint rule flags it as unresolved. This is a false positive — users naturally backtick function names when explaining transforms in NL strings.

Example:
```stm
PID.PhoneHome -> telecom {
  "Create telecom entry with system='phone', use='home'.
   Format as E.164 if possible using \`to_e164\`.
   Skip if \`PID.PhoneHome\` is empty."
}
```

The \`to_e164\` backtick reference is flagged:
```
warning [unresolved-nl-ref] NL reference `to_e164` does not resolve to any known identifier
```

Known transform functions should be recognized and not flagged.

## Acceptance Criteria

1. Known pipeline function names from the spec (trim, lowercase, to_utc, to_iso8601, validate_email, etc.) are not flagged when backticked in NL text
2. Unknown function-like names are still flagged
3. The list of recognized functions matches the pipeline tokens in SATSUMA-V2-SPEC.md section 7.2

## Notes

**2026-03-24T10:00:00Z**

Verified: `to_e164` (the example in this ticket) is NOT listed in the spec's pipeline tokens (section 7.2). The spec lists: trim, lowercase, uppercase, coalesce, round, split, first, last, to_utc, to_iso8601, parse, null_if_empty, null_if_invalid, drop_if_invalid, drop_if_null, warn_if_invalid, warn_if_null, error_if_invalid, error_if_null, validate_email, now_utc, title_case, escape_html, truncate, to_number, prepend, max_length. The bug is still real — any of those spec-listed names would be flagged if backticked in NL. But `to_e164` specifically is a user-defined function and arguably should be flagged.


## Notes

**2026-03-24T09:05:00Z**

Cause: Known pipeline function names (trim, to_utc, etc.) were not recognized and flagged as unresolved.
Fix: Added KNOWN_PIPELINE_FUNCTIONS set (28 functions from spec section 7.2) and skip them in checkUnresolvedNlRef. Note: to_e164 is NOT in the spec list and is correctly still flagged. (commit pending)
