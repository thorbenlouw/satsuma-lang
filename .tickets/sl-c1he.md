---
id: sl-c1he
status: closed
deps: []
links: [sl-4m85]
created: 2026-03-21T07:58:41Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, metric, exploratory-testing]
---
# metric: text output omits comments (// //! //?) from metric body

The satsuma metric command drops all comments from the metric body in text output. The spec defines comments as valid content inside metric bodies, and the grammar (metric_body) accepts COMMENT nodes.

- What I did: ran 'satsuma metric commented /tmp/satsuma-test-metric/'
- The source file contains:
    pageviews INTEGER (measure additive) // total page views
    //! Data quality: some sessions are double-counted
    //? Should we add a dedup step?
    unique_views INTEGER (measure non_additive)
- Expected: Comments should appear in the text output (at minimum //! and //? which are warning/question annotations)
- Actual output:
    metric commented (source events) {
      pageviews           INTEGER (measure additive)
      unique_views        INTEGER (measure non_additive)
    }
  All three comments are silently dropped.

Root cause: printDefault() in metric.ts iterates body.namedChildren and only handles field_decl and note_block types, ignoring comment nodes.

Test file: /tmp/satsuma-test-metric/basic.stm

