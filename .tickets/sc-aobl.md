---
id: sc-aobl
status: open
deps: []
links: []
created: 2026-03-29T12:53:05Z
type: feature
priority: 1
assignee: Thorben Louw
tags: [vscode, field-lineage, phase-1]
---
# vscode: new FieldLineagePanel host backed by field-lineage CLI

Replace webview/lineage/panel.ts with a new webview/field-lineage/panel.ts. The panel calls 'satsuma field-lineage <schema.field> <workspacePath> --json --depth <n>' via runCli (single call, not a loop). Sends { type: 'fieldLineageData', payload: { field, upstream, downstream } } to the webview. Stores the focal field and workspace root. Handles the refresh/re-centre flow when the webview requests a different focal field. Wires theme detection (isDark) the same way VizPanel does.

## Acceptance Criteria

- Panel opens without an input box when fieldPath is provided
- Single CLI call replaces the old multi-hop arrows loop
- Payload sent to webview matches { field: string, upstream: [{field, via_mapping, classification}], downstream: [...] }
- Re-centre message from webview triggers a new CLI call and re-sends updated payload
- Panel title updates to reflect the current focal field
- Breadcrumb trail is maintained as an array in panel state and sent with each payload update
- isDark flag sent with payload as in VizPanel
- Navigate message from webview opens the correct file and line in the editor
- All existing CLI integration paths (anonymous mappings, NL-derived edges) exercised in a manual smoke test

