# Useful Prompts

Self-contained system prompts you can paste into any web LLM (ChatGPT, Gemini,
Claude.ai) to work with Satsuma without installing any tooling.

## Available Prompts

### [excel-to-stm-prompt.md](excel-to-stm-prompt.md)

**Excel-to-Satsuma Conversion Specialist** — Upload this prompt alongside a
mapping spreadsheet and the LLM will convert it into idiomatic Satsuma v2 files.

The prompt includes the full Satsuma grammar, a quick reference cheat sheet,
generation rules, worked examples, and a self-critique checklist. It produces
Satsuma output with a confidence rating and flags ambiguities for human review.

**How to use:**

1. Open any capable web LLM (ChatGPT, Gemini, Claude.ai).
2. Paste or upload `excel-to-stm-prompt.md` as your system prompt or first
   message.
3. Upload your Excel mapping spreadsheet.
4. Review the generated `.stm` output and the self-critique checklist.
5. Validate locally with `satsuma validate` if you have the CLI installed.

**Limitations:** This is a best-effort conversion — the output has not been
parsed or validated. Review all `//?` markers and `"..."` NL transforms before
using the output.

### [security-report-prompt.md](security-report-prompt.md)

**Security Report Generator** — A structured prompt for regenerating
`SECURITY-REPORT.md` at the repository root. An agent running this prompt will
perform a fresh threat model of the Satsuma toolchain: audit dependencies,
verify security properties in source code, review CI/CD controls, and produce
a balanced enterprise-ready security assessment.

**How to use:**

1. Open a coding agent (Claude Code, Copilot, Cursor, etc.) in the repo root.
2. Paste or reference `useful-prompts/security-report-prompt.md` as your prompt.
3. The agent will read source files, verify claims, and generate an updated report.
4. Review the output and commit.
