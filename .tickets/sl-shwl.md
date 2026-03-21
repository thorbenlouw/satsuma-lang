---
id: sl-shwl
status: closed
deps: []
links: [sl-armj]
created: 2026-03-21T07:59:52Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, mapping, exploratory-testing]
---
# mapping: --json output missing classification field on arrows

The `satsuma mapping --json` output does not include the transform classification (`structural`, `nl`, `mixed`, `none`) on arrows. The CLI docs and `SATSUMA-CLI.md` state that every arrow carries a classification. The `arrows` command correctly shows classification (e.g. `[mixed]`, `[structural]`), but `mapping --json` does not.

**What I did:**
```bash
satsuma mapping 'customer migration' examples/ --json
```

**Expected:** Each arrow object should include a `classification` field (one of: `structural`, `nl`, `mixed`, `none`).

**Actual:** Arrow objects only contain: `kind`, `src`, `tgt`, `hasTransform`. No classification field.

For comparison, `satsuma arrows legacy_sqlserver.PHONE_NBR examples/` correctly shows `[mixed]` classification on the arrow.

The text output of `mapping` also does not show classification markers on arrows (unlike the `arrows` command).

**Test file:** /tmp/satsuma-test-mapping/basic.stm

