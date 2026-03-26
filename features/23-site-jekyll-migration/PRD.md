# Feature 23 — Migrate Site to Eleventy (11ty) Static Site Generator

> **Status: IN PROGRESS** (ticket sl-7pmb)

## Goal

Migrate the `site/` directory from hand-authored HTML pages to an Eleventy-based static site generator. The site must look and behave identically to the current version while becoming dramatically more maintainable — shared structure lives in layouts and includes, Satsuma code examples live in data files, and dynamic values (version, stats) are injected via Eleventy's data layer instead of `sed` replacements.

---

## Problem

The site is 5 HTML pages totalling ~4,176 lines with heavy structural duplication:

- **Navigation** (~40 lines) copied identically across all 5 pages, with only the active-link class varying per page.
- **Footer** (~45 lines) copied identically across all 5 pages.
- **Head block** (~38 lines) — Tailwind config, fonts, meta tags — copied identically.
- **Version tokens** (`__VERSION__`, `__VERSION_TAG__`) scattered across all pages, injected via `sed` in the deploy workflow.

When the language syntax changed (Feature 22), every page had to be manually updated. A single code example edit requires finding and modifying raw HTML in a 1,200-line file. There is no way to preview the site locally without a static file server, and no build step to catch broken templates.

---

## Design Principles

1. **Pixel-identical output.** The migrated site must be visually indistinguishable from the current site. All Tailwind classes, custom CSS, fonts, colours, animations, and interactive behaviours are preserved exactly.
2. **Minimal abstraction.** One layout, a handful of includes, and data files for repeated content. No over-engineering — this is a 5-page site.
3. **Data-driven examples.** Satsuma code examples are maintained in data files, not embedded in HTML. Updating an example means editing one data entry, not hunting through page HTML.
4. **Self-contained in `site/`.** All Eleventy configuration, layouts, includes, and data files live inside `site/`. The rest of the repo is unaffected.
5. **Node-native toolchain.** No Ruby, no Gemfile. Eleventy runs on Node.js, which the repo already uses for the CLI and VS Code extension.
6. **Local preview.** `cd site && npx @11ty/eleventy --serve` gives a live-reloading local preview.

---

## Non-Goals

- Redesigning the site (the current design is excellent — preserve it).
- Adding a blog, CMS, or content pipeline.
- Migrating away from Tailwind CDN (it works, keep it).
- Internationalisation or multi-language support.

---

## Framework Decision: Eleventy (11ty)

**Eleventy over Jekyll/Hugo** for these reasons:

| Factor | Eleventy | Jekyll | Hugo |
|--------|----------|--------|------|
| Runtime | Node.js (already in repo) | Ruby (new dependency) | Go binary |
| Template language | Nunjucks (same `{{ }}` / `{% %}` as Liquid) | Liquid | Go templates |
| Install | `npm install` | `gem install` + Bundler | Binary download |
| Build speed | Fast, incremental | Slow for Ruby startup | Fastest |
| GitHub Pages | Actions build (`npx eleventy`) | Native but limited | Actions build |
| Data files | `_data/*.json` or `_data/*.yml` | `_data/*.yml` | `data/*.yml` |
| Site scale | Perfect for 5 pages | Also fine | Overkill |

Key advantages of Eleventy:
- **Zero new toolchain.** The repo already has Node.js, npm, and package.json. No Ruby installation, no Gemfile, no `bundle install`.
- **Nunjucks templates** are syntactically near-identical to Liquid, so the migration is straightforward.
- **Passthrough file copy** for `css/`, `js/`, `img/` — no processing, just copies to output.
- **No opinion on output structure** — files stay where they are, URLs don't change.

---

## Architecture

### Directory Structure

```
site/
  .eleventy.js               # Eleventy config (input/output dirs, passthrough copy)
  package.json               # @11ty/eleventy dependency
  _layouts/
    default.njk              # Base layout: head + nav + {{ content | safe }} + footer + scripts
  _includes/
    head.njk                 # <head>: meta, fonts, Tailwind config, custom.css
    nav.njk                  # Fixed navbar (desktop + mobile), active state via page data
    footer.njk               # 4-column footer with version from global data
  _data/
    site.json                # version, version_tag (written by deploy workflow)
    examples.json            # 20 example entries (id, title, description, tags, category, code)
  css/custom.css             # Unchanged (passthrough)
  js/main.js                 # Unchanged (passthrough)
  js/tailwind.js             # Unchanged (passthrough)
  img/                       # Unchanged (passthrough)
  index.njk                  # Front matter + page content only
  cli.njk                    # Front matter + page content only
  vscode.njk                 # Front matter + page content only
  examples.njk               # Front matter + data-driven example rendering
  learn.njk                  # Front matter + page content only
```

### Eleventy Config: `.eleventy.js`

```js
module.exports = function(eleventyConfig) {
  // Passthrough copy for static assets
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("img");

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
```

### Layout: `default.njk`

Single layout wrapping all pages:

```html
<!DOCTYPE html>
<html lang="en">
{% include "head.njk" %}
<body class="font-sans antialiased">
  {% include "nav.njk" %}
  {{ content | safe }}
  {% include "footer.njk" %}
  <script src="js/main.js"></script>
</body>
</html>
```

### Active Navigation

Replace per-page hardcoded active classes with Nunjucks logic using front matter `nav_id`:

```nunjucks
<a href="index.html"
   class="nav-link text-sm font-medium{% if nav_id == 'home' %} active{% endif %}">
  Home
</a>
```

### Version Tokens

Current approach: `__VERSION__` and `__VERSION_TAG__` placeholders replaced by `sed` in the deploy workflow.

New approach: The deploy workflow writes `site/_data/site.json`:

```json
{
  "version": "v0.2.0",
  "version_tag": "v0.2.0"
}
```

Templates reference `{{ site.version }}` and `{{ site.version_tag }}`. For local development, `_data/site.json` ships with placeholder values.

### Examples Data File

All 20 examples from `examples.html` extracted to `_data/examples.json`:

```json
[
  {
    "id": "db-to-db",
    "title": "Database-to-Database Migration",
    "description": "Map legacy customer records to a modern normalised schema...",
    "tags": ["database", "migration", "normalize"],
    "category": "database-migration",
    "code": "source legacy_customers { ... }"
  }
]
```

Rendered via Nunjucks loop in `examples.njk`:
```nunjucks
{% for example in examples %}
  ...
{% endfor %}
```

### Deploy Workflow

Updated `.github/workflows/deploy-site.yml`:

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0

  - uses: actions/setup-node@v4
    with:
      node-version: 20

  - name: Install site dependencies
    run: cd site && npm ci

  - name: Write version data
    run: |
      TAG="v$(cat VERSION | tr -d '[:space:]')"
      echo "{\"version\":\"$TAG\",\"version_tag\":\"$TAG\"}" > site/_data/site.json

  - name: Build site
    run: cd site && npx @11ty/eleventy

  - uses: actions/configure-pages@v4
  - uses: actions/upload-pages-artifact@v3
    with:
      path: site/_site
  - uses: actions/deploy-pages@v4
```

---

## TODO

### Phase 1: Scaffold and shared components
- [ ] Create `site/package.json` with `@11ty/eleventy` dependency
- [ ] Create `site/.eleventy.js` config
- [ ] Create `site/_layouts/default.njk`
- [ ] Extract `site/_includes/head.njk` from shared `<head>` block
- [ ] Extract `site/_includes/nav.njk` with Nunjucks active-state logic
- [ ] Extract `site/_includes/footer.njk` with version data references
- [ ] Create `site/_data/site.json` with placeholder version values
- [ ] Verify `npx @11ty/eleventy` succeeds with scaffold

### Phase 2: Convert pages
- [ ] Convert `index.html` to `index.njk` (front matter, strip duplicates, use includes)
- [ ] Convert `cli.html` to `cli.njk`
- [ ] Convert `vscode.html` to `vscode.njk`
- [ ] Convert `learn.html` to `learn.njk`
- [ ] Convert `examples.html` to `examples.njk` with data-driven rendering
- [ ] Extract examples to `site/_data/examples.json`
- [ ] Delete original `.html` page files

### Phase 3: Deploy and verify
- [ ] Delete `site/.nojekyll`
- [ ] Update `.github/workflows/deploy-site.yml` for Eleventy build
- [ ] Verify local build produces pixel-identical output
- [ ] Verify all interactivity works (mobile menu, copy, tabs, FAQ, scroll reveal)
- [ ] Verify version tokens render correctly
- [ ] Add site development docs (how to preview, add examples, update content)

---

## Acceptance Criteria

1. Site builds with `cd site && npx @11ty/eleventy`
2. Satsuma code examples extracted into `_data/examples.json` (or equivalent data files)
3. Shared layout (header, footer, nav) in a base template, not duplicated per page
4. Feature descriptions and CLI command lists driven by data/config where practical
5. Existing design (Tailwind styling, logo, page structure) preserved — pixel-identical
6. Site development documented (how to add/update content, preview locally)
7. Site deploys to GitHub Pages from the Eleventy build output
8. Deploy workflow injects version values via `_data/site.json` instead of `sed`
9. `__VERSION__` / `__VERSION_TAG__` placeholders no longer appear in source files
10. All interactive features work: mobile menu, copy buttons, scroll reveal, tabs, FAQ accordions

---

## Risks

- **Nunjucks/Tailwind conflict:** Nunjucks uses `{{ }}` which could conflict with Tailwind's JIT if we ever move off CDN. Mitigated: we're staying on CDN, and `{% raw %}` blocks can escape Nunjucks if needed.
- **Large code blocks in data files:** Multi-line Satsuma examples in JSON need escaped newlines. Mitigated: use JSON with `\n` in strings, or keep examples as separate HTML partials in `_includes/examples/`.
- **Node version compatibility:** Eleventy 3.x requires Node 18+. The repo already uses Node 20+ for the CLI.
