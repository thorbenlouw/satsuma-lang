---
id: sl-akdg
status: closed
deps: []
links: []
created: 2026-03-31T08:27:22Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validate, exploratory-testing]
---
# validate/lint: field-not-in-schema check never fires for arrow source/target fields

The validate command does not report when an arrow references a field that does not exist in the declared source or target schema. The check exists in validate.ts (checkArrowFieldRefs) but never fires in practice.

Repro:
```bash
cat > /tmp/test-field.stm << 'EOF'
schema src_fld { id INT (pk); name STRING }
schema tgt_fld { id INT (pk); display_name STRING }
mapping {
  source { src_fld }
  target { tgt_fld }
  id -> id
  nonexistent_field -> display_name { trim }
}
EOF
satsuma validate /tmp/test-field.stm --json
# Output: findings: [], 0 errors, 0 warnings
# Expected: warning about nonexistent_field not being in src_fld
```

The graph command happily creates an edge from ::src_fld.nonexistent_field -> ::tgt_fld.display_name, confirming the field doesn't exist but is used in an arrow.

Similarly, arrow target fields not in the target schema are also not caught:
```
name -> nonexistent_target_field { trim }  # no diagnostic
```

Suspected cause: the arrow.mapping name format (e.g. '<anon>@path:10') may not match the mapping.name used in the iteration loop, causing the check on line 454 of validate.ts to skip all arrows.

## Notes

**2026-04-01**

Cause: `checkArrowFieldRefs` in validate.ts iterated `index.mappings` by name but compared `arrow.mapping` against `mapping.name`. For anonymous mappings, `name` is `null` while `arrow.mapping` carries the synthetic key `<anon>@file:row` — they never compared equal, so all arrows for anonymous mappings were silently skipped.
Fix: Changed iteration to `for (const [indexKey, mapping] of index.mappings)` and compare `arrow.mapping` against `indexKey` (stripped of namespace prefix) when `mapping.name === null`. Named mappings still compare by name. (commit 9f55a7b)
