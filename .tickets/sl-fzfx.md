---
id: sl-fzfx
status: closed
deps: []
links: [sl-0ycs]
created: 2026-03-21T07:58:41Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lineage, exploratory-testing]
---
# lineage: --to silently ignored when combined with --from

When both --from and --to are provided, the CLI silently ignores --to and performs only --from traversal. It should either error with a clear message that both cannot be specified, or filter results to show only paths from --from to --to.

What I did:
  npx satsuma lineage --from crm_system --to analytics_db examples/multi-source-hub.stm

What I expected:
  Either an error saying both --from and --to cannot be specified together, or output showing only the path from crm_system to analytics_db.

What actually happened:
  Full --from crm_system output including notification_service (which is NOT related to analytics_db):
  crm_system  [schema]
    crm to analytics  [mapping]
      analytics_db  [schema]
    crm to notifications  [mapping]
      notification_service  [schema]

Reproducer: examples/multi-source-hub.stm

