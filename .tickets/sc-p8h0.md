---
id: sc-p8h0
status: closed
deps: [sc-aobl, sc-rdrc, sc-4kdu]
links: []
created: 2026-03-29T12:53:45Z
type: feature
priority: 1
assignee: Thorben Louw
tags: [vscode, field-lineage, phase-1, package-json]
---
# vscode: tighten package.json command surface for Phase 1

Update package.json contributes section: (1) Change context menu when clause for satsuma.traceFieldLineage from 'editorLangId == satsuma' to 'editorLangId == satsuma' (retain for now — the satsuma.cursorOnField context key is a Phase 3 enhancement; for Phase 1 the command gracefully handles non-field cursor positions per sc-4kdu). (2) Rename the command title from 'Satsuma: Trace Field Lineage' to 'Trace Field Lineage' in the satsuma group. (3) Remove satsuma.showArrows from editor/context (it is removed fully in Phase 2, but it should not appear in the right-click menu once the field lineage panel is available). (4) Ensure satsuma.traceFieldLineage appears prominently in the context menu group above showCoverage.

## Acceptance Criteria

- Context menu shows 'Trace Field Lineage' (not 'Satsuma: Trace Field Lineage') in the satsuma group
- showArrows no longer appears in the right-click context menu
- showArrows still appears in command palette (full removal is Phase 2)
- Extension activates cleanly with no contribution errors in the extension host log


## Notes

**2026-03-29T13:11:31Z**

**2026-03-29**

Cause: Right-click menu still showed old 'showArrows' entry and command title was generic.
Fix: Renamed traceFieldLineage title to 'Satsuma: Show Field Lineage'; removed showArrows from editor/context menu (kept in commandPalette so the command is still accessible — full removal tracked by sc-cim8).
