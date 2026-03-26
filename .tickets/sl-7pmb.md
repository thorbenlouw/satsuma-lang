---
id: sl-7pmb
status: open
deps: [sl-ydwn]
links: []
created: 2026-03-26T07:43:51Z
type: task
priority: 3
assignee: Thorben Louw
tags: [site, infra]
---
# Migrate site/ to Jekyll or Hugo static site generator

The site/ directory is currently raw HTML with Tailwind CDN. Migrate to a static site generator (Jekyll or Hugo) so that Satsuma code examples, feature descriptions, and page structure can be maintained via templates and partials. This makes it easy to update examples across all pages when the language evolves (e.g. syntax changes like Feature 22) without manually editing each HTML file. Evaluate Jekyll (simpler, GitHub Pages native) vs Hugo (faster builds, richer templating) and choose based on project needs.

## Acceptance Criteria

- Site builds with a single command (e.g. hugo build or bundle exec jekyll build)
- Satsuma code examples extracted into reusable includes/partials or data files
- Shared layout (header, footer, nav) in a base template, not duplicated per page
- Feature descriptions and CLI command lists driven by data/config where practical
- Existing design (Tailwind styling, logo, page structure) preserved
- README or CONTRIBUTING note explains how to add/update site content
- Site deploys to GitHub Pages (or equivalent) from the build output

