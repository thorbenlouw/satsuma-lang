---
id: sl-kf76
status: open
deps: [sl-ainj]
links: []
created: 2026-03-22T07:44:55Z
type: bug
priority: 2
assignee: Thorben Louw
parent: sl-a778
tags: [cli, diff, exploratory-testing-2]
---
# diff: metric/mapping note changes attributed as orphaned top-level notes

When a note block inside a metric changes, the change appears in the top-level notes.added/notes.removed arrays with no parent block attribution, instead of being reported under the owning metric.

## Reproduction

v1.stm:
```stm
schema orders { id INTEGER }
metric daily_signups {
  source orders
  note { "Counts new signups per day." }
  signups INTEGER (measure additive)
}
```

v2.stm:
```stm
schema orders { id INTEGER }
metric daily_signups {
  source orders
  note { "Counts new signups per day, excluding bots." }
  signups INTEGER (measure additive)
}
```

Run: `satsuma diff v1.stm v2.stm --json`

Expected: Change attributed to metrics > daily_signups.
Actual: metrics.changed is empty. The old/new note text appears in notes.added and notes.removed with no parent association.

