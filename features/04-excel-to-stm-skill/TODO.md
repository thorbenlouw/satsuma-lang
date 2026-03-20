# Excel-to-Satsuma Skill — TODO

> **Status: PARTIAL** — Phase 0 lite prompt authored. Remaining phases deferred (see `FUTURE-WORK.md`).

## Phase 0: Lite System Prompt
- [x] Author `excel-to-satsuma-prompt.md` — assemble grammar, cheat sheet, examples, generation rules, and self-critique checklist from `AI-AGENT-REFERENCE.md`
- [ ] Test lite prompt against 2–3 sample spreadsheets on ChatGPT / Gemini / Claude.ai
- [ ] Iterate on prompt wording based on output quality

## Phase 1: Python CLI Tool (`excel_tool.py`)
- [ ] Scaffold `excel_tool.py` with CLI arg parsing and subcommand dispatch
- [ ] Implement `survey` subcommand (tab metadata, row/col counts, merged cells, frozen panes, filters, first 3 rows preview)
- [ ] Implement `headers` subcommand (column headers, sample rows, inferred data types)
- [ ] Implement `formatting` subcommand (conditional formatting, fill colours + frequency, hidden rows/cols, data validation, row groupings)
- [ ] Implement `range` subcommand (cell values for specified row/col range, with headers)
- [ ] Implement `lookup` subcommand (full tab content for small reference tabs, with row cap)
- [ ] Add output size enforcement / truncation with warning
- [ ] Add `requirements.txt` with openpyxl
- [ ] Add venv bootstrap logic (auto-create `.venv/` on first run)
- [ ] Test against diverse sample spreadsheets

## Phase 2: Skill Prompt — Survey Phase
- [ ] Create `.claude/commands/excel-to-satsuma.md` skill prompt
- [ ] Implement Phase 0 (bootstrap & input validation) in prompt: dependency check, file validation, size check, output dir check
- [ ] Implement Phase 1 (survey) in prompt: tab inventory, tab classification, mapping deep dive, reference extraction, guidance summary
- [ ] Implement discovery report output (`.excel-to-satsuma/discovery-report.md`)
- [ ] Implement user confirmation gate
- [ ] Support `--dry-run` flag
- [ ] Test survey flow end-to-end

## Phase 3: Skill Prompt — Translate Phase
- [ ] Add Satsuma generation instructions to skill prompt (load `AI-AGENT-REFERENCE.md`, select canonical examples)
- [ ] Implement file structure planning (how many files, fragments, shared common file)
- [ ] Implement chunked row extraction and Satsuma generation (100 rows per chunk)
- [ ] Wire up tree-sitter validation (`scripts/tree-sitter-local.sh parse`)
- [ ] Add heuristic fallback validation when tree-sitter unavailable
- [ ] Support `--tabs` filtering
- [ ] Test with single-tab 1:1 mappings, then multi-tab/multi-file

## Phase 4: Skill Prompt — Critique & Refine Phase
- [ ] Add critique checklist to skill prompt (coverage, types, transforms, idiom, documentation, structure)
- [ ] Implement refinement loop with stall detection and iteration cap
- [ ] Generate `review.md` with confidence rating and exit condition
- [ ] Generate `meta.json` with machine-readable metadata
- [ ] Support `--max-iterations` and `--skip-critique` flags
- [ ] Support `--no-confirm` and `--overwrite` flags

## Phase 5: End-to-End Validation
- [ ] Test both variants against 5–10 real-world mapping spreadsheets
- [ ] Document failure modes and tune heuristics
- [ ] Compare Lite vs Full output quality
- [ ] Update prompts based on observed issues
