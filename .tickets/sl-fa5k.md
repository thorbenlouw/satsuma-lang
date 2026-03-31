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
# ADR-022: update website (site/) and lessons — all CLI examples to file-based

Update website and learning materials to reflect file-based CLI scope per ADR-022.

Files:
- site/cli.njk — ~6 examples with examples/ or directory paths
- lessons/01-what-is-satsuma.md — 2 directory examples
- lessons/02-reading-satsuma.md — 1 directory example
- lessons/08-satsuma-cli.md — ~6 directory examples
- lessons/09-agent-workflows.md — 3 examples with .
- lessons/10-real-world-workflows.md — 2 examples with .
- lessons/12-data-engineer-playbook.md — 3 examples with .
- lessons/13-governance-playbook.md — ~6 examples with .

All CLI examples must use file entry points, not directories.

