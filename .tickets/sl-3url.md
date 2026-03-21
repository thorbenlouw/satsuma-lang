---
id: sl-3url
status: open
deps: []
links: []
created: 2026-03-21T08:01:31Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lineage, exploratory-testing]
---
# lineage: multiple-target mapping only recognizes first target, name includes backticks

When a mapping declares multiple targets in the target block (e.g., target { `t1`, `t2` } or target { `t1` `t2` }), lineage only recognizes the first target and its name is mangled to include backtick characters and/or trailing comma.

What I did:
  Created /tmp/satsuma-test-lineage/multi-target.stm with:
    mapping 'multi target' {
      source { `mt_source` }
      target { `mt_target_1`, `mt_target_2` }
      id -> id
      name -> name
      code -> code
    }

  npx satsuma lineage --from mt_source /tmp/satsuma-test-lineage/multi-target.stm

What I expected:
  Both mt_target_1 and mt_target_2 shown as downstream of the mapping.

What actually happened:
  Only one target is shown, with a mangled name including backtick and comma:
  mt_source  [schema]
    multi target  [mapping]
      `mt_target_1`,  [schema]

  JSON output confirms the target name is "`mt_target_1`," — backticks and comma are included in the name.
  The second target (mt_target_2) is completely lost from lineage.
  Backward lineage (--to mt_target_2) shows no upstream path.
  Summary also shows parse errors: 1.

Note: The grammar (ref_list) allows multiple entries in target declarations, and multi-source works correctly. This appears to be a target-specific parsing or extraction issue.

Reproducers:
  /tmp/satsuma-test-lineage/multi-target.stm
  /tmp/satsuma-test-lineage/multi-target-v2.stm

