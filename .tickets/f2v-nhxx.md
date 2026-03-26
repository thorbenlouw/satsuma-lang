---
id: f2v-nhxx
status: closed
deps: []
links: []
created: 2026-03-26T23:39:42Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, ux]
---
# Remove Satsuma: Show Workspace Graph command (replaced by Mapping Viz)

Remove the old Satsuma: Show Workspace Graph command and GraphPanel webview since the new Mapping Visualization provides a better, more detailed view. Remove the command registration, GraphPanel class, graph webview files, and the graph entry in package.json contributes.

## Acceptance Criteria

- satsuma.showGraph command is removed from package.json
- GraphPanel class and graph webview files are deleted
- No references to showGraph remain in extension.ts
- esbuild.js no longer builds the graph webview
- Show Mapping Visualization is the primary viz command


## Notes

**2026-03-26T23:46:18Z**

Removed showGraph command, GraphPanel class, graph webview files (graph.ts, graph.css, panel.ts), graph esbuild config, and graph CSS copy. Show Mapping Visualization is now the primary viz.
