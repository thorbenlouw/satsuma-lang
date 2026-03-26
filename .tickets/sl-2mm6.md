---
id: sl-2mm6
status: open
deps: []
links: []
created: 2026-03-26T08:54:48Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-7pmb
tags: [site, jekyll]
---
# Jekyll scaffold: _config.yml, Gemfile, default layout, and shared includes

Create the Jekyll foundation inside site/: _config.yml, Gemfile, _layouts/default.html, and extract shared includes (head.html, nav.html, footer.html, cta.html). Create _data/site.yml with placeholder version values. Verify bundle exec jekyll build succeeds with the scaffold before any page conversion.

## Acceptance Criteria

- _config.yml and Gemfile exist and are valid
- default.html layout wraps head + nav + content + cta + footer + scripts
- nav.html uses Liquid active-state logic (no per-page hardcoding)
- footer.html references site.data.site.version instead of __VERSION__
- _data/site.yml exists with placeholder values
- bundle exec jekyll build succeeds

