# Exploratory Testing: `satsuma arrows`

## Context

You are an exploratory QA agent for the Satsuma CLI. Your job is to thoroughly test the `satsuma arrows` subcommand, find bugs, and log them as tickets. **Do not fix any bugs — only report them.**

## Setup

1. Read these files to understand the language and CLI contract:
   - `AI-AGENT-REFERENCE.md` — compact grammar and cheat sheet
   - `SATSUMA-CLI.md` — full CLI command reference
   - `SATSUMA-V2-SPEC.md` — authoritative language specification
2. Read the `satsuma arrows --help` output.
3. Review existing open bug tickets with `tk list` to avoid duplicating known issues.
4. Explore the `examples/` folder for mappings with various arrow types.

## What to test

`satsuma arrows <schema.field> [path]` shows all arrows involving a field, with transform classification.

Test areas:
- **Basic arrow lookup**: Find arrows for a field that appears in a mapping. Correct source/target shown?
- **`--as-source` flag**: Only arrows where the field is on the left side of `->`.
- **`--as-target` flag**: Only arrows where the field is on the right side of `->`.
- **Transform classification**: Each arrow should be classified as `structural`, `nl`, `mixed`, or `none`. Verify correctness.
- **Derived arrows**: `-> target { ... }` arrows with no source. Correctly flagged?
- **Structural transforms**: `{ trim | lowercase }`. Classified as `structural`?
- **NL transforms**: `{ "Convert to uppercase" }`. Classified as `nl`?
- **Mixed transforms**: `{ trim | "then apply custom logic" }`. Classified as `mixed`?
- **No transform**: `src -> tgt` with no braces. Classified as `none`?
- **Map transforms**: `{ map { A: "a", B: "b" } }`. Classification?
- **Nested arrow fields**: Fields inside nested arrow blocks (`src[] -> tgt[] { .child -> .child }`). Can you look up the child?
- **Field in multiple mappings**: Same field referenced in different mappings. All arrows returned?
- **Dotted field paths**: `record.child` field paths.
- **Backtick field names**: Fields like `` `field-name` ``.
- **`--json` flag**: Valid JSON with arrow details, classification, and transform content?
- **Field not found**: Non-existent schema or field. Exit code?
- **Schema exists but field doesn't**: Correct error message?
- **Namespace-qualified fields**: `crm::customers.name`.
- **NL backtick references**: Are implicit arrows from backtick references in NL included?
- **Arithmetic transforms**: `{ * 100 }`, `{ + 1 }`. Classified as `structural`?
- **Function transforms**: `{ now_utc() }`, `{ uuid_v5("ns", id) }`. Classification?

## Creating test fixtures

Create all temporary test files under `/tmp/satsuma-test-arrows/`. Construct mappings with every arrow and transform variant.

## Logging bugs

When you find a bug:
1. Check `tk list` for existing tickets describing the same issue.
2. If no duplicate exists, create a ticket:
   ```bash
   tk create "arrows: <concise bug title>" \
     -t bug \
     -d "<detailed description including:
     - What you did (exact command)
     - What you expected
     - What actually happened (paste actual output)
     - Path to the test file that reproduces it>"
   ```
3. Tag it with `--tags cli,arrows,exploratory-testing`.

## Rules

- **Do not fix bugs.** Only log them.
- **Do not modify any existing files** in the repo. Only create files in `/tmp/`.
- Be systematic and paste actual CLI output in tickets.
