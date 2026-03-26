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
tags: [site, jekyll]
---
# Update deploy workflow for Jekyll build and add site dev docs

Update .github/workflows/deploy-site.yml to use actions/jekyll-build-pages for building from site/ directory. Write version data to _data/site.yml instead of sed replacement. Delete site/.nojekyll. Add documentation on how to preview the site locally, add/update examples, and update content.

## Acceptance Criteria

- deploy-site.yml uses actions/jekyll-build-pages with source: ./site
- Version injection writes _data/site.yml instead of sed replacement
- site/.nojekyll deleted
- Site development docs added (preview, add examples, update content)
- All interactive features verified working (mobile menu, copy, tabs, FAQ, scroll reveal)

