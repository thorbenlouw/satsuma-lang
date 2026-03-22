---
id: sl-z57o
status: closed
deps: [sl-3dd2]
links: [sl-wvn8]
created: 2026-03-21T08:00:58Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, nl-refs, exploratory-testing]
---
# nl-refs: does not extract backtick refs from note blocks inside mappings

The `satsuma nl-refs` command extracts backtick references from NL strings in mapping arrow transform bodies, but completely ignores backtick references in `note { }` blocks that appear inside mapping bodies.

According to the command description ('Extract backtick references from NL transform bodies'), the scope is limited to arrow transforms. However, note blocks inside mappings are semantically part of the mapping and often reference fields/schemas from the mapping's source/target declarations. These references are valuable for the same use cases (validation, lineage, where-used) that arrow NL refs serve.

What I did:
  satsuma nl-refs /tmp/satsuma-test-nl-refs/mapping-note-refs.stm

The file contains:
  mapping 'account sync' {
    source { \`src_accounts\` }
    target { \`tgt_accounts\` }
    note { "This mapping converts \`src_accounts\` into \`tgt_accounts\`. Pay attention to \`balance\` precision." }
    ...
    balance -> balance_usd { "Convert \`balance\` to USD" }
  }

Expected: 4 refs extracted (src_accounts, tgt_accounts, balance from the note + balance from the arrow)
Actual: 1 ref extracted (only the balance ref from the arrow transform on line 22)

The note block refs on line 19 (\`src_accounts\`, \`tgt_accounts\`, \`balance\`) are silently dropped.

Reproducing fixture: /tmp/satsuma-test-nl-refs/mapping-note-refs.stm

