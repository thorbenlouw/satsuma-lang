# Feature 23 — Migrate Site to Jekyll Static Site Generator

> **Status: IN PROGRESS** (ticket sl-7pmb)

## Goal

Migrate the `site/` directory from hand-authored HTML pages to a Jekyll-based static site generator. The site must look and behave identically to the current version while becoming dramatically more maintainable — shared structure lives in layouts and includes, Satsuma code examples live in data files, and dynamic values (version, stats) are injected via Jekyll's data layer instead of `sed` replacements.

---

## Problem

The site is 5 HTML pages totalling ~4,176 lines with heavy structural duplication:

- **Navigation** (~40 lines) copied identically across all 5 pages, with only the active-link class varying per page.
- **Footer** (~45 lines) copied identically across all 5 pages.
- **Head block** (~38 lines) — Tailwind config, fonts, meta tags — copied identically.
- **CTA section** — identical "Get Started" banner on every page.
- **Version tokens** (`__VERSION__`, `__VERSION_TAG__`) scattered across all pages, injected via `sed` in the deploy workflow.

When the language syntax changed (Feature 22), every page had to be manually updated. A single code example edit requires finding and modifying raw HTML in a 1,200-line file. There is no way to preview the site locally without a static file server, and no build step to catch broken templates.

---

## Design Principles

1. **Pixel-identical output.** The migrated site must be visually indistinguishable from the current site. All Tailwind classes, custom CSS, fonts, colours, animations, and interactive behaviours are preserved exactly.
2. **Minimal abstraction.** One layout, a handful of includes, and data files for repeated content. No over-engineering — this is a 5-page site.
3. **Data-driven examples.** Satsuma code examples are maintained in YAML data files, not embedded in HTML. Updating an example means editing one YAML entry, not hunting through page HTML.
4. **Self-contained in `site/`.** All Jekyll configuration, layouts, includes, and data files live inside `site/`. The rest of the repo is unaffected.
5. **Local preview.** `cd site && bundle exec jekyll serve` gives a live-reloading local preview.

---

## Non-Goals

- Redesigning the site (the current design is excellent — preserve it).
- Adding a blog, CMS, or content pipeline.
- Migrating away from Tailwind CDN (it works, keep it).
- Internationalisation or multi-language support.

---

## Framework Decision: Jekyll

**Jekyll over Hugo** for these reasons:

| Factor | Jekyll | Hugo |
|--------|--------|------|
| GitHub Pages | Native support (with Actions build) | Requires custom Actions build |
| Template language | Liquid — close to HTML, low learning curve | Go templates — more powerful but unfamiliar |
| Site scale | 5 pages, no blog — Jekyll is more than sufficient | Speed advantage irrelevant at this scale |
| Ecosystem | Mature, well-documented, huge community | Also mature, but smaller for simple sites |
| Tailwind CDN | Works unchanged | Works unchanged |

GitHub Pages doesn't build Jekyll from an arbitrary `site/` subdirectory (only root or `/docs`), so we'll use `actions/jekyll-build-pages` in the deploy workflow to build from `site/` and upload the output. This is still simpler than a Hugo setup and keeps `site/` self-contained.

---

## Architecture

### Directory Structure

```
site/
  _config.yml                # Jekyll config (title, description, baseurl)
  Gemfile                    # gem "jekyll", plugins
  _layouts/
    default.html             # Base layout: head + nav + {{ content }} + footer + scripts
  _includes/
    head.html                # <head>: meta, fonts, Tailwind config, custom.css
    nav.html                 # Fixed navbar (desktop + mobile), active state via page.url
    footer.html              # 4-column footer with version from site data
    cta.html                 # Shared "Get Started" CTA banner
    code-block.html          # Parameterised Satsuma code block with copy button
    terminal.html            # Parameterised terminal-style block
  _data/
    examples.yml             # 20 example entries (id, title, description, tags, category, code)
    site.yml                 # version, version_tag (written by deploy workflow)
  css/custom.css             # Unchanged
  js/main.js                 # Unchanged
  js/tailwind.js             # Unchanged
  img/                       # Unchanged
  index.html                 # Front matter + page content only
  cli.html                   # Front matter + page content only
  vscode.html                # Front matter + page content only
  examples.html              # Front matter + data-driven example rendering
  learn.html                 # Front matter + page content only
```

### Layout: `default.html`

Single layout wrapping all pages:

```html
<!DOCTYPE html>
<html lang="en">
{% include head.html %}
<body class="font-sans antialiased">
  {% include nav.html %}
  {{ content }}
  {% include cta.html %}
  {% include footer.html %}
  <script src="{{ '/js/main.js' | relative_url }}"></script>
</body>
</html>
```

Pages that don't have a CTA can set `cta: false` in front matter.

### Active Navigation

Replace per-page hardcoded active classes with Liquid logic:

```liquid
<a href="{{ '/index.html' | relative_url }}"
   class="nav-link text-sm font-medium {% if page.url == '/index.html' or page.url == '/' %}active{% endif %}">
  Home
</a>
```

### Version Tokens

Current approach: `__VERSION__` and `__VERSION_TAG__` placeholders replaced by `sed` in the deploy workflow.

New approach: The deploy workflow writes `site/_data/site.yml`:

```yaml
version: v0.2.0
version_tag: v0.2.0
```

Templates reference `{{ site.data.site.version }}` and `{{ site.data.site.version_tag }}`. For local development, `_data/site.yml` ships with placeholder values.

### Examples Data File

All 20 examples from `examples.html` extracted to `_data/examples.yml`:

```yaml
- id: db-to-db
  title: "Database-to-Database Migration"
  description: "Map legacy customer records to a modern normalised schema..."
  tags: [database, migration, normalize]
  category: database-migration
  code: |
    source legacy_customers { ... }
    target dim_customer { ... }
    ...
```

Rendered via Liquid loop in `examples.html`. The hero example on `index.html` can reference a specific entry by ID or remain inline.

### Deploy Workflow

Updated `.github/workflows/deploy-site.yml`:

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0

  - name: Write version data
    run: |
      TAG="v$(cat VERSION | tr -d '[:space:]')"
      mkdir -p site/_data
      echo "version: \"$TAG\"" > site/_data/site.yml
      echo "version_tag: \"$TAG\"" >> site/_data/site.yml

  - uses: actions/configure-pages@v4

  - name: Build Jekyll site
    uses: actions/jekyll-build-pages@v1
    with:
      source: ./site
      destination: ./_site

  - uses: actions/upload-pages-artifact@v3
    with:
      path: ./_site

  - uses: actions/deploy-pages@v4
```

---

## TODO

### Phase 1: Scaffold and shared components
- [ ] Create `site/_config.yml` and `site/Gemfile`
- [ ] Create `site/_layouts/default.html`
- [ ] Extract `site/_includes/head.html` from shared `<head>` block
- [ ] Extract `site/_includes/nav.html` with Liquid active-state logic
- [ ] Extract `site/_includes/footer.html` with version data references
- [ ] Extract `site/_includes/cta.html`
- [ ] Create `site/_data/site.yml` with placeholder version values
- [ ] Verify `bundle exec jekyll build` succeeds with scaffold

### Phase 2: Convert pages
- [ ] Convert `index.html` to Jekyll (front matter, strip duplicates, use includes)
- [ ] Convert `cli.html` to Jekyll
- [ ] Convert `vscode.html` to Jekyll
- [ ] Convert `learn.html` to Jekyll
- [ ] Convert `examples.html` to Jekyll with data-driven rendering
- [ ] Extract examples to `site/_data/examples.yml`
- [ ] Create `site/_includes/code-block.html` parameterised include
- [ ] Create `site/_includes/terminal.html` parameterised include

### Phase 3: Deploy and verify
- [ ] Delete `site/.nojekyll`
- [ ] Update `.github/workflows/deploy-site.yml` for Jekyll build
- [ ] Verify local build produces pixel-identical output
- [ ] Verify all interactivity works (mobile menu, copy, tabs, FAQ, scroll reveal)
- [ ] Verify version tokens render correctly
- [ ] Add site development docs (how to preview, add examples, update content)

---

## Acceptance Criteria

1. Site builds with `cd site && bundle exec jekyll build`
2. Satsuma code examples extracted into `_data/examples.yml` (or equivalent data files)
3. Shared layout (header, footer, nav) in a base template, not duplicated per page
4. Feature descriptions and CLI command lists driven by data/config where practical
5. Existing design (Tailwind styling, logo, page structure) preserved — pixel-identical
6. Site development documented (how to add/update content, preview locally)
7. Site deploys to GitHub Pages from the Jekyll build output
8. Deploy workflow injects version values via `_data/site.yml` instead of `sed`
9. `__VERSION__` / `__VERSION_TAG__` placeholders no longer appear in source files
10. All interactive features work: mobile menu, copy buttons, scroll reveal, tabs, FAQ accordions

---

## Risks

- **Liquid/Tailwind conflict:** Liquid uses `{{ }}` which could conflict with Tailwind's JIT if we ever move off CDN. Mitigated: we're staying on CDN, and raw tags can escape Liquid if needed.
- **Jekyll build in Actions:** `actions/jekyll-build-pages` is maintained by GitHub and widely used. Low risk.
- **Large code blocks in YAML:** Multi-line Satsuma examples in YAML need careful indentation. Mitigated: use `|` block scalar syntax and validate during build.
