# ADR-015 — Eleventy as Static Site Generator

**Status:** Accepted
**Date:** 2026-03 (retrospective, PR #109)

## Context

The Satsuma project site (`site/`) started as 5 hand-authored HTML pages (~4,176 lines) with duplicated nav, footer, and head sections. Version tokens (`__VERSION__`) were injected by `sed` in the CI deploy workflow. There was no local preview capability and no template reuse.

As the site grew (landing page, learn guide, CLI reference, examples, FAQ, diaries), maintaining duplicated HTML became untenable. A static site generator was needed.

The alternatives considered were:
- **Jekyll** — Ruby-based, widely used for GitHub Pages. Would introduce a new runtime (Ruby) to a Node.js-only project.
- **Hugo** — Go-based, very fast. Would also introduce a new runtime.
- **Eleventy (11ty)** — Node.js-based, uses Nunjucks/Liquid templates, zero client-side JavaScript by default. Runs on the existing Node.js toolchain.

## Decision

Use Eleventy with Nunjucks templates for the project site.

Shared markup (nav, footer, head) is extracted into `site/_includes/` with a single `default.njk` layout. Version and metadata tokens are served from `site/_data/site.json` via Eleventy's data layer, eliminating the `sed` injection hack. The deploy workflow builds with `npx @11ty/eleventy` and uploads the `_site/` output directory.

Development instructions live in `SITE-DEV.md`. Local preview uses `npx @11ty/eleventy --serve` with live reload.

## Consequences

**Positive:**
- No new runtime — Eleventy runs on Node.js, which is already required by the parser, CLI, and VS Code extension
- Nunjucks template syntax (`{{ }}`, `{% %}`) is familiar to anyone who has used Jinja2 or Liquid
- Data layer (`_data/site.json`) provides a clean, versionable way to manage site metadata
- The output is pixel-identical to the previous hand-authored HTML — zero visual regression

**Negative:**
- Eleventy is less widely known than Jekyll or Hugo — contributors may need to read its docs
- The Nunjucks template language has some quirks (e.g., whitespace handling, macro scoping) compared to more mainstream template engines
