---
id: sl-2mm6
status: closed
deps: []
links: []
created: 2026-03-26T08:54:48Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-7pmb
tags: [site, eleventy]
---
# Eleventy scaffold: .eleventy.js, package.json, default layout, and shared includes

Create the Eleventy foundation inside site/: package.json with @11ty/eleventy dependency, .eleventy.js config with passthrough copy for css/js/img, _layouts/default.njk, and extract shared includes (head.njk, nav.njk, footer.njk). Create _data/site.json with placeholder version values. Verify `npx @11ty/eleventy` succeeds with the scaffold before any page conversion.

## Acceptance Criteria

- package.json with @11ty/eleventy dependency exists
- .eleventy.js configures input/output dirs and passthrough copy
- default.njk layout wraps head + nav + content + footer + scripts
- nav.njk uses Nunjucks active-state logic (no per-page hardcoding)
- footer.njk references site.version instead of __VERSION__
- _data/site.json exists with placeholder values
- `npx @11ty/eleventy` succeeds

