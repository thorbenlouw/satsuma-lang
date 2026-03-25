---
id: cbh-y5og
status: closed
deps: []
links: [cbh-cyl0, cbh-h0or, cbh-n4vm]
created: 2026-03-25T11:18:20Z
type: bug
priority: 2
assignee: Thorben Louw
---
# lineage: NL backtick references in transform text create phantom source edges

The lineage command treats backtick schema references inside NL transform text as actual source connections, creating phantom edges in lineage output.

- Exact command: satsuma lineage --from stg_users /tmp/satsuma-bug-hunt/
- Expected: stg_users should only connect to 'user activity mart' mapping (which declares stg_users as a source)
- Actual: stg_users also connects to 'nl reference test' mapping, which only declares source { raw_events } and target { stg_events }. The 'nl reference test' mapping mentions stg_users in NL transform text ('If stg_users already has this user, skip the validation') but does NOT declare it as a source.
- The graph command correctly shows 'nl reference test' only has raw_events as source (schema_edges). But lineage walks through NL-referenced schemas as if they were real sources.
- Reproducible in both --from and --to directions.
- Also visible in: satsuma lineage --to mart_user_activity (shows path raw_users -> ... -> stg_users -> nl reference test -> stg_events -> ...)
- JSON output confirms: {src: 'stg_users', tgt: 'nl reference test'} edge exists in lineage JSON.
- Test file: /tmp/satsuma-bug-hunt/edge-cases.stm (mapping 'nl reference test' at line 27)

