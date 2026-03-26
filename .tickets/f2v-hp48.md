---
id: f2v-hp48
status: closed
deps: []
links: []
created: 2026-03-26T23:39:26Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, ux]
---
# Register .satsuma extension and add file icon for .stm/.satsuma

Register .satsuma as an additional file extension for the Satsuma language alongside .stm. Add a custom file icon (the satsuma orange icon) that appears in the file explorer and editor tabs for both .stm and .satsuma files. Requires an iconTheme contribution or fileIcon contribution in package.json.

## Acceptance Criteria

- .satsuma files are recognised as Satsuma language (syntax highlighting, LSP features)
- Both .stm and .satsuma files show the satsuma icon in the file explorer
- Both .stm and .satsuma files show the satsuma icon next to the filename in editor tabs
- Icon is visible in both light and dark themes


## Notes

**2026-03-26T23:46:18Z**

.satsuma added to language extensions alongside .stm. File icon (orange satsuma SVG) added via language icon contribution. Icon theme also contributed for file explorer.
