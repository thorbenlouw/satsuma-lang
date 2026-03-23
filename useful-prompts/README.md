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
