---
id: sl-in1y
status: open
deps: []
links: [sl-btgr]
created: 2026-03-21T07:59:14Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, arrows, exploratory-testing]
---
# arrows: arithmetic transforms classified as [none] instead of [structural]

Arithmetic transform steps ({ * 100 }, { + 1 }, { / 2 }, { - 5 }) are classified as [none] instead of [structural].

The classifier recognizes the step type as 'arithmetic_step' in JSON output (steps array), but the classification logic does not count arithmetic_step as a structural step.

What I did:
  satsuma arrows source_sys.amount /tmp/satsuma-test-arrows/all-arrows.stm
  satsuma arrows source_sys.score /tmp/satsuma-test-arrows/all-arrows.stm

What I expected:
  amount -> amount_cents { * 100 }  [structural]
  score -> risk_score { + 1 }  [structural]

What actually happened:
  amount -> amount_cents { * 100 }  [none]
  score -> risk_score { + 1 }  [none]

JSON output confirms the step is parsed correctly:
  { "type": "arithmetic_step", "text": "* 100" }
  but classification is "none"

In contrast, other pipeline steps like { round(0) | to_number } are correctly classified as [structural].

When arithmetic is mixed with other steps, e.g. { round(0) | to_number }, the classification is [structural] — the issue is specifically when arithmetic is the *only* transform step.

Reproducer file: /tmp/satsuma-test-arrows/all-arrows.stm

