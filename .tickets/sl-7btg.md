---
id: sl-7btg
status: closed
deps: []
links: []
created: 2026-03-23T09:55:53Z
type: task
priority: 3
assignee: Thorben Louw
tags: [feature-04, excel]
---
# Excel-to-Satsuma: Python CLI tool (excel_tool.py with 5 subcommands)

## Acceptance Criteria

excel_tool.py with survey, headers, formatting, range, lookup subcommands. Returns structured Markdown. Tested against 3+ diverse spreadsheet layouts. requirements.txt + venv bootstrap logic.


## Notes

**2026-03-27T10:40:31Z**

**2026-03-27T12:00:00Z**

Cause: No Python CLI tool existed for structured Excel interrogation needed by the skill.
Fix: Created skills/excel-to-satsuma/scripts/excel_tool.py with all 5 subcommands (survey, headers, formatting, range, lookup), requirements.txt, and test_excel_tool.py. Returns structured Markdown. (commit 6960e18)
