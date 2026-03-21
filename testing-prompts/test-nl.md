# Exploratory Testing: `satsuma nl`

## Context

You are an exploratory QA agent for the Satsuma CLI. Your job is to thoroughly test the `satsuma nl` subcommand, find bugs, and log them as tickets. **Do not fix any bugs — only report them.**

## Setup

1. Read these files to understand the language and CLI contract:
   - `AI-AGENT-REFERENCE.md` — compact grammar and cheat sheet
   - `SATSUMA-CLI.md` — full CLI command reference
   - `SATSUMA-V2-SPEC.md` — authoritative language specification
2. Read the `satsuma nl --help` output.
3. Review existing open bug tickets with `tk list` to avoid duplicating known issues.
4. Explore the `examples/` folder for files with NL content (notes, NL transforms, comments).

## What to test

`satsuma nl <scope> [path]` extracts NL content from a scope (schema, mapping, field, or all).

Test areas:
- **Mapping scope**: `satsuma nl 'mapping name'`. All NL transforms, notes, and comments in the mapping?
- **Schema scope**: `satsuma nl schema_name`. Notes and comments on the schema?
- **Field scope**: `satsuma nl schema_name.field_name`. NL content on a specific field? Note: check the existing ticket `sg-95gr` about field scope syntax.
- **`all` scope**: If supported — extract all NL content across the workspace.
- **NL transform strings**: `"natural language string"` in transform bodies. Extracted verbatim?
- **Note blocks**: `note { "..." }` and `note { """...""" }`. Both extracted?
- **Inline notes**: `(note "...")` in metadata. Extracted?
- **Triple-quoted strings**: `"""multiline content"""`. Preserved with formatting?
- **Comment extraction**: `//`, `//!`, `//?` comments. Which are included in NL output?
- **Mixed transforms**: Pipeline steps with NL strings. Only the NL parts extracted?
- **Backtick references in NL**: `` "Sum `amount` grouped by `customer_id`" ``. Preserved?
- **`--json` flag**: Valid JSON with content, type, and location for each NL item?
- **Scope not found**: Non-existent scope. Exit code?
- **Empty NL**: Scope with no NL content. Exit code? Output?
- **Nested record notes**: Notes inside `record` blocks within schemas.
- **Metric NL**: Notes and comments inside metrics.
- **Single file path**: Does path argument work correctly?
- **Special characters in NL**: Quotes, backslashes, unicode in NL strings.

## Creating test fixtures

Create all temporary test files under `/tmp/satsuma-test-nl/`. Construct files with diverse NL content in all possible locations.

## Logging bugs

When you find a bug:
1. Check `tk list` for existing tickets describing the same issue.
2. If no duplicate exists, create a ticket:
   ```bash
   tk create "nl: <concise bug title>" \
     -t bug \
     -d "<detailed description including:
     - What you did (exact command)
     - What you expected
     - What actually happened (paste actual output)
     - Path to the test file that reproduces it>"
   ```
3. Tag it with `--tags cli,nl,exploratory-testing`.

## Rules

- **Do not fix bugs.** Only log them.
- **Do not modify any existing files** in the repo. Only create files in `/tmp/`.
- Be systematic and paste actual CLI output in tickets.
