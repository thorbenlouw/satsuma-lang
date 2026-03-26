---
id: ser-3g1j
status: closed
deps: []
links: []
created: 2026-03-26T18:11:05Z
type: Set up @satsuma/viz package (Lit + esbuild + design tokens)
priority: P1
assignee: Thorben Louw
---
# Untitled

Initialize tooling/satsuma-viz/ package with:
- package.json with Lit, esbuild, and dev dependencies
- esbuild config for bundling web components
- src/model.ts — VizModel TypeScript interfaces (copy from PRD)
- src/tokens.css — design tokens from PRD (colors, typography, shadows)
- tsconfig.json
- Basic test infrastructure

Acceptance:
- npm install succeeds
- npm run build produces a bundled JS file
- TypeScript compiles cleanly
- Design tokens CSS file matches PRD color palette


## Notes

**2026-03-26T21:03:43Z**

## Notes

**2026-03-26T19:00:00Z**

Cause: New package needed for the portable visualization web component.
Fix: Created tooling/satsuma-viz/ with Lit 3, esbuild, VizModel types (model.ts),
design tokens CSS (tokens.css, light + dark), three card components (schema, metric,
fragment), DOM shim test infrastructure, and 9 passing tests. Updated root
install:all/clean:all/ci:all scripts.
