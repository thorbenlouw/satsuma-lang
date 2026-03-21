---
id: sl-3dd2
status: open
deps: []
links: []
created: 2026-03-21T08:01:05Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, nl-refs, exploratory-testing]
---
# nl-refs: does not extract backtick refs from standalone transform blocks

The `satsuma nl-refs` command does not extract backtick references from NL strings inside named `transform` blocks. When a mapping uses `...transform_name` to spread a transform, the NL content in that transform block contains backtick refs that are never surfaced.

What I did:
  satsuma nl-refs /tmp/satsuma-test-nl-refs/transform-block-refs.stm

The file contains:
  transform build_fullname {
    "Concatenate \`first_name\` and \`last_name\` with a space"
  }
  transform region_lookup {
    "Map \`region_code\` to full region name using standard mapping"
  }
  mapping 'transform block test' {
    source { \`data_in\` }
    target { \`data_out\` }
    -> full_name { ...build_fullname }
    region_code -> region_name { ...region_lookup }
  }

Expected: 3 refs extracted (first_name, last_name from build_fullname; region_code from region_lookup)
Actual: No NL backtick references found.

This means that any mapping using reusable transform blocks has its NL refs invisible to nl-refs. The refs in the transform blocks are semantically equivalent to inline NL in arrow bodies but are completely missed.

Reproducing fixture: /tmp/satsuma-test-nl-refs/transform-block-refs.stm

