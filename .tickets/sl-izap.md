---
id: sl-izap
status: open
deps: []
links: []
created: 2026-03-21T08:00:35Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, where-used, exploratory-testing]
---
# where-used: import statements not surfaced as references

When a name appears in an `import { name } from "file.stm"` statement, where-used does not detect this as a reference.

**What I did:**
```bash
satsuma where-used 'sfdc standard types' /Users/thorben/dev/personal/satsuma-lang/examples/
```

The fragment `'sfdc standard types'` is defined in examples/lib/sfdc_fragments.stm and imported in examples/sfdc_to_snowflake.stm via:
`import { 'sfdc standard types' } from "lib/sfdc_fragments.stm"`

**What I expected:**
The import statement should surface as a reference, e.g. 'Imported in: sfdc_to_snowflake.stm'.

**What actually happened:**
```
No references to 'sfdc standard types' found.
```

Import statements are structural cross-file references and should be surfaced. This also means that if a fragment is imported but only used via its spread in the importing file, neither the import nor the spread from cross-file resolution would show up.

Similarly for `alpha` in /tmp/satsuma-test-where-used/cross-ref.stm which imports alpha but the import itself is not listed as a reference kind.

**Reproduction files:** /Users/thorben/dev/personal/satsuma-lang/examples/sfdc_to_snowflake.stm, /tmp/satsuma-test-where-used/cross-ref.stm

