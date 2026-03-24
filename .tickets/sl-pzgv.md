---
id: sl-pzgv
status: closed
deps: []
links: []
created: 2026-03-24T08:13:57Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, diff]
---
# diff command does not show removals (things in A but not B)

When comparing two files/directories, `satsuma diff` only shows additions (things in B but not A). Schemas, fragments, and other definitions that exist in file A but not in file B are not shown as removals.

Repro:
```bash
satsuma diff bug-hunt/scenario-02-trading-lib.stm bug-hunt/scenario-02-trading-flow.stm --json
# JSON output:
# schemas.removed: []    ← WRONG
# fragments.removed: []  ← WRONG
# But scenario-02-trading-lib.stm has venue_codes, instrument_ref schemas
# and party_id, money_fields, timestamps fragments that are NOT in the flow file
```

Text output also shows only `+` additions, no `-` removals.

## Acceptance Criteria

1. Schemas/fragments/mappings/metrics in A but not B appear in the 'removed' list
2. Both JSON and text output show removals
3. Removals are shown with `-` prefix in text output
4. Works for cross-directory diffs too


## Notes

**2026-03-24T08:19:59Z**

Follow-up testing shows diff removals DO work for single-file comparisons (lib.stm where schemas were removed shows correct - prefix). The original test compared files with import relationships (lib imports flow), where imported definitions may be resolved and considered part of both files. The bug may be limited to: (1) directory-to-directory diff behavior, or (2) diff doesn't handle the import relationship correctly when definitions exist in the first file but are imported into the second.

**2026-03-24T10:00:00Z**

Confirmed: `diff examples/common.stm examples/db-to-db.stm --json` correctly shows `schemas.removed: [country_codes, currency_rates, product_catalog]` and `fragments.removed: [address fields, audit columns]`. The bug is specifically when file B imports from file A — the import-resolved definitions from A appear in B's workspace, making them not count as "removed". This is an import-resolution scoping issue in diff, not a general removals bug. Narrowing title and scope accordingly.

**2026-03-24T09:34:43Z**

Cause: `resolveInput()` follows import declarations when resolving single files. When file B imports from file A, both files end up in B's index, so definitions from A never appear as 'removed'.
Fix: Added `followImports` option to `resolveInput()` (defaults to `true`). The diff command now passes `{ followImports: false }` so it compares only definitions directly in each file/directory, not import-resolved workspaces.
