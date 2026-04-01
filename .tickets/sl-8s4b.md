---
id: sl-8s4b
status: closed
deps: []
links: []
created: 2026-03-31T08:25:11Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, exploratory-testing]
---
# summary: totalErrors reports 0 for files with parse errors

When a .stm file has parse errors (confirmed by 'satsuma validate'), the summary command's totalErrors field still reports 0. The summary also does not surface any indication that parse errors exist in the workspace.

Repro:
Create a file with: schema broken { id INT (pk  name STRING }  (missing closing paren)
satsuma validate -> reports 1 error
satsuma summary --json -> totalErrors: 0

The summary should reflect parse errors so that consumers know the workspace has structural issues without needing to run validate separately.

