---
id: sl-xy4s
status: closed
deps: []
links: []
created: 2026-03-31T08:24:07Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, arrows, field-lineage, exploratory-testing]
---
# arrows/field-lineage: uuid_v5("ns", id) misclassified as mixed instead of structural

When a function call has a quoted string argument (e.g. uuid_v5("ns", id)), the classifier sees the string literal as NL content and returns 'mixed'. The string is a function parameter, not a natural-language description. Expected: 'structural'. Actual: 'mixed'.

Repro:
  echo 'schema s { id STRING } schema t { id STRING } mapping { source { s } target { t } id -> id { uuid_v5("ns", id) } }' > /tmp/test.stm
  satsuma arrows t.id --json /tmp/test.stm

Root cause: classify.ts treats any nl_string child of a pipe_text node as NL regardless of whether it's a function argument. Function parameters like uuid_v5("ns", id) should be wholly structural.

Also affects: encrypt("AES-256-GCM", key), hash("sha256"), replace("old", "new"), prepend("prefix"), append("suffix"), split("."), etc. — any pipeline function that takes a string argument will be misclassified as mixed.


## Notes

**2026-03-31T08:25:11Z**

This is likely a side-effect of the sl-tfqt fix. That fix changed classify.ts to detect NL when ANY child of a pipe_text node is an nl_string. The problem is that function arguments like uuid_v5("ns", id) have their string literal parsed as nl_string by the grammar, so the classifier now incorrectly flags them as NL. The fix likely needs to distinguish between top-level NL strings (which are transform descriptions) and string literals used as function arguments.

**2026-03-31**

Closed — deferred. Pipeline function names are planned for removal from the language (only NL and reusable `...transform` spreads will remain). Fixing classification for a construct that will be removed is not worthwhile.
