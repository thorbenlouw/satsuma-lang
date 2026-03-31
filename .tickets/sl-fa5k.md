---
id: sl-fa5k
status: open
deps: [sl-o9mh]
links: []
created: 2026-03-31T09:45:40Z
type: task
priority: 2
assignee: Thorben Louw
tags: [docs, site, lessons, adr-022]
---
# ADR-022: update website and lessons for file-based CLI usage

Update website and learning materials to reflect the actual ADR-022 direction: commands target explicit entry files, while import visibility inside files remains selective and dependency-based.

Files:
- `site/cli.njk`
- `lessons/01-what-is-satsuma.md`
- `lessons/02-reading-satsuma.md`
- `lessons/08-satsuma-cli.md`
- `lessons/09-agent-workflows.md`
- `lessons/10-real-world-workflows.md`
- `lessons/12-data-engineer-playbook.md`
- `lessons/13-governance-playbook.md`

Documentation goals:
- use entry-file examples instead of directory examples
- avoid examples that accidentally imply the whole repository is one workspace
- explain selective transitive dependency reachability separately from file-based workspace selection
