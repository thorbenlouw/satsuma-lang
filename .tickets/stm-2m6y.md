---
id: stm-2m6y
status: open
deps: [stm-o50b]
links: []
created: 2026-03-16T13:46:39Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-t1n8
---
# Scaffold the VS Code STM extension package

Create the initial tooling/vscode-stm extension package with language registration, language configuration, manifest wiring, and basic development documentation so the extension is installable before full grammar coverage lands.

## Acceptance Criteria

tooling/vscode-stm/ exists with package.json, language-configuration.json, syntaxes/ directory, and minimal README.
The extension registers language id stm and associates .stm files.
Language configuration covers line comments, bracket pairs, and auto-closing/surrounding pairs appropriate for STM.
The extension can be installed or loaded locally for development.
Development and test commands are documented and non-interactive.

