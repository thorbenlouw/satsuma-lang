---
id: sl-7pmb
status: closed
deps: [sl-ydwn]
links: []
created: 2026-03-26T07:43:51Z
type: task
priority: 3
assignee: Thorben Louw
tags: [site, infra]
---
# Migrate site/ to Eleventy (11ty) static site generator

The site/ directory is currently raw HTML with Tailwind CDN. Migrate to Eleventy (11ty) so that Satsuma code examples, feature descriptions, and page structure can be maintained via Nunjucks templates and data files. Eleventy was chosen over Jekyll/Hugo because it runs on Node.js (already in the repo toolchain), uses Nunjucks templates (same syntax as Liquid), and requires no new runtime dependencies. See `features/23-site-jekyll-migration/PRD.md` for the full framework evaluation.

## Acceptance Criteria

- Site builds with a single command (`cd site && npx @11ty/eleventy`)
- Satsuma code examples extracted into reusable includes/partials or data files
- Shared layout (header, footer, nav) in a base template, not duplicated per page
- Feature descriptions and CLI command lists driven by data/config where practical
- Existing design (Tailwind styling, logo, page structure) preserved
- README or CONTRIBUTING note explains how to add/update site content
- Site deploys to GitHub Pages (or equivalent) from the build output
- Release workflow updated to inject templated values (VERSION, test count, corpus test count, CLI command count, etc.) and rebuild the static site before publishing

## Notes

The current site publishing happens via a GitHub Actions release workflow. After the SSG migration, that workflow must run the SSG build step with dynamic values injected — e.g. current version number, number of passing tests, number of corpus tests, number of CLI commands — so these stay accurate on the live site without manual updates. These values should come from the build/test output or a generated data file, not be hardcoded in templates.
