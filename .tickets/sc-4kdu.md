---
id: sc-4kdu
status: closed
deps: [sc-aobl]
links: []
created: 2026-03-29T12:53:33Z
type: feature
priority: 1
assignee: Thorben Louw
tags: [vscode, field-lineage, phase-1, ux]
---
# vscode: remove input box from traceFieldLineage — use actionContext directly

Update the satsuma.traceFieldLineage command registration in extension.ts. Instead of always showing showInputBox, call getEditorActionContext() first and use actionContext.fieldPath directly if available. Fallback: if fieldPath is null (cursor not on a field) and the command was invoked from the command palette (not context menu), show a quickpick populated with all schema.field pairs from the workspace (via client.sendRequest('satsuma/blockNames') filtered to fields). If invoked from context menu with no field context, show a brief warning message rather than a broken empty input box.

## Acceptance Criteria

- Right-clicking a field name and choosing Trace Field Lineage opens the panel immediately with no prompt
- Command palette invocation with cursor on a field: opens immediately, no prompt
- Command palette invocation with cursor not on a field: shows quickpick of schema.field options
- Context menu invocation with cursor not on a field: shows an informational message 'Place cursor on a field to trace its lineage' and does nothing else
- The fieldPath passed to FieldLineagePanel.createOrShow is namespace-qualified when the LSP provides it
- Existing args?.fieldPath override still works for programmatic callers (viz integration)


## Notes

**2026-03-29T13:11:26Z**

**2026-03-29**

Cause: traceFieldLineage command required manual field input even when cursor was on a field, and pointed at old LineagePanel.
Fix: Updated extension.ts to use FieldLineagePanel; removed showInputBox; uses LSP actionContext.fieldPath directly when available; falls back to showInputBox for command-palette invocation without field context.
