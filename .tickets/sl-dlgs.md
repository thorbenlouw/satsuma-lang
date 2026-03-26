---
id: sl-dlgs
status: open
deps: [sl-gxi1]
links: []
created: 2026-03-26T08:55:03Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-7pmb
tags: [site, eleventy]
---
# Update deploy workflow for Eleventy build and add site dev docs

Update .github/workflows/deploy-site.yml to use Node.js + `npx @11ty/eleventy` for building from site/ directory. Write version data to _data/site.json instead of sed replacement. Delete site/.nojekyll. Add documentation on how to preview the site locally, add/update examples, and update content.

## Acceptance Criteria

- deploy-site.yml installs Node.js, runs npm ci in site/, then npx @11ty/eleventy
- Version injection writes _data/site.json instead of sed replacement
- site/.nojekyll deleted
- Site development docs added (preview, add examples, update content)
- All interactive features verified working (mobile menu, copy, tabs, FAQ, scroll reveal)

