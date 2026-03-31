---
id: sl-lzcp
status: closed
deps: []
links: []
created: 2026-03-31T08:28:33Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, primitives, exploratory-testing]
---
# nl/arrows: pipeline function string arguments extracted as NL content and misclassified as mixed

String arguments to pipeline functions (e.g. prepend("PRE_"), split("/"), replace("old", "new"), pad_left(10, "0"), uuid_v5("namespace", id)) are extracted by 'satsuma nl' as [transform] NL items and cause the arrow to be classified as 'mixed' instead of 'structural'.

Reproduction:
  echo 'schema s1 { a STRING }
  schema t1 { x STRING }
  mapping m { source { s1 } target { t1 }
    a -> x { prepend("PRE_") }
  }' > /tmp/test.stm
  satsuma nl m /tmp/test.stm
  # Output: [transform] PRE_ (m)
  satsuma arrows s1.a /tmp/test.stm --json
  # classification: "mixed" (should be "structural")

Expected: pipeline function arguments are not NL content. nl should return nothing for purely structural transforms. arrows classification should be 'structural'.

Affects canonical examples: lpad(10, "0") in cobol-to-avro, split("/") in edi-to-json, parse("MM/DD/YYYY") in db-to-db.

Root cause: NL extraction walks all string nodes in a transform body without distinguishing strings that are pipe_step NL content from strings that are function call arguments.

## Notes

**2026-03-31**

Closed — deferred. Same root cause as sl-xy4s. Pipeline function names are planned for removal from the language. Not worth fixing classification for a construct that will be removed.

