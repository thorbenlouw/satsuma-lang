---
id: sl-zgam
status: closed
deps: [sl-7btg]
links: []
created: 2026-03-23T09:55:53Z
type: task
priority: 3
assignee: Thorben Louw
tags: [feature-04, excel]
---
# Excel-to-Satsuma: Claude Code skill prompt (survey + translate + critique phases)

## Acceptance Criteria

Skill prompt at .claude/commands/excel-to-satsuma.md. Survey phase with user confirmation gate. Translate phase with chunked extraction. Critique phase with refinement loop. End-to-end test against 2+ spreadsheets.


## Notes

**2026-03-27T10:40:46Z**

**2026-03-27T12:00:00Z**

Cause: No Claude Code skill prompt existed for Excel-to-Satsuma conversion.
Fix: Created skills/excel-to-satsuma/SKILL.md with full three-phase workflow (survey with confirmation gate, chunked translation, critique+refine loop) and .claude/commands/excel-to-satsuma.md as the invocable command. (commits db22327, 5f84879)
