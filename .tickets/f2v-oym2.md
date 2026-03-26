---
id: f2v-oym2
status: closed
deps: [f2v-46cn]
links: []
created: 2026-03-26T22:35:49Z
type: task
priority: 1
assignee: Thorben Louw
---
# VS Code VizPanel integration

Phase 1.5 of Feature 23. Add:
- VizPanel singleton webview panel
- 'Satsuma: Show Mapping Visualization' command
- Editor title button (eye icon) for .stm files
- Wire LSP satsuma/vizModel request to webview postMessage
- Click-to-navigate from webview back to editor
- Auto-refresh on file save
- Respect VS Code color theme (light/dark detection)
- Content Security Policy (nonce-restricted scripts)

Acceptance:
- Command opens viz panel beside active .stm editor
- VizModel loads and renders in webview
- Click on card/field/arrow navigates to source location
- Panel refreshes on save
- Works in both light and dark themes


## Notes

**2026-03-26T22:50:04Z**

## Notes

**2026-03-26T19:50:00Z**

Cause: Need VS Code integration to display mapping visualization in a webview panel.
Fix: Added VizPanel singleton webview panel with LSP satsuma/vizModel request,
'Satsuma: Show Mapping Visualization' command, editor title eye icon for .stm files,
click-to-navigate from webview, auto-refresh on save, dark theme detection. Webview
bundles @satsuma/viz via esbuild alias into IIFE format for CSP compliance.
