---
id: sl-gxi1
status: in_progress
deps: [sl-2mm6]
links: []
created: 2026-03-26T08:54:56Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-7pmb
tags: [site, eleventy]
---
# Convert all 5 pages to Eleventy and extract examples to data file

Convert index.html, cli.html, vscode.html, learn.html, and examples.html to Nunjucks templates (.njk) with front matter. Strip duplicated head/nav/footer/scripts and use includes. Extract all 20 Satsuma code examples from examples.html into _data/examples.json and render via Nunjucks loop. Delete the original .html page files. All pages must be pixel-identical to current site.

## Acceptance Criteria

- All 5 pages are .njk files with YAML front matter and default layout
- No duplicated nav/footer/head/scripts in any page
- _data/examples.json contains all 20 examples
- examples.njk renders examples from data file via Nunjucks loop
- __VERSION__ / __VERSION_TAG__ replaced with Nunjucks variables everywhere
- Original .html page files deleted
- All pages visually identical to current site

