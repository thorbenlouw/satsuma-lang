---
id: f2v-oym2
status: open
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

