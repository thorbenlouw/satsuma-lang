---
id: f2v-oywh
status: open
deps: [f2v-hp48]
links: []
created: 2026-03-26T23:39:34Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, ux]
---
# Show viz preview icon for .stm and .satsuma files

The editor title eye icon (Show Mapping Visualization) should appear for both .stm and .satsuma files. Currently the when clause only matches editorLangId == satsuma — verify that .satsuma files also trigger this after the extension registration change. Update any when clauses that reference file extensions directly.

## Acceptance Criteria

- Eye icon appears in editor title bar for .stm files
- Eye icon appears in editor title bar for .satsuma files
- Clicking opens the VizPanel for either extension
- Command palette entry also works for .satsuma files

