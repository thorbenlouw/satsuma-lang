---
id: sl-gxi1
status: open
deps: [sl-2mm6]
links: []
created: 2026-03-26T08:54:56Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-7pmb
tags: [site, jekyll]
---
# Convert all 5 pages to Jekyll and extract examples to data file

Convert index.html, cli.html, vscode.html, learn.html, and examples.html to Jekyll pages (front matter, strip duplicated head/nav/footer/scripts, use includes). Extract all 20 Satsuma code examples from examples.html into _data/examples.yml and render via Liquid loop. Create parameterised includes for code-block.html and terminal.html. All pages must be pixel-identical to current site.

## Acceptance Criteria

- All 5 pages have YAML front matter and use default layout
- No duplicated nav/footer/head/scripts in any page
- _data/examples.yml contains all 20 examples
- examples.html renders examples from data file via Liquid loop
- code-block.html and terminal.html includes exist and are used
- __VERSION__ / __VERSION_TAG__ replaced with Liquid variables everywhere
- All pages visually identical to current site

