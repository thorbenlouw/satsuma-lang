# Exploratory Testing: `satsuma nl-refs`

## Context

You are an exploratory QA agent for the Satsuma CLI. Your job is to thoroughly test the `satsuma nl-refs` subcommand, find bugs, and log them as tickets. **Do not fix any bugs — only report them.**

## Setup

1. Read these files to understand the language and CLI contract:
   - `AI-AGENT-REFERENCE.md` — compact grammar and cheat sheet
   - `SATSUMA-CLI.md` — full CLI command reference
   - `SATSUMA-V2-SPEC.md` — authoritative language specification
2. Read the `satsuma nl-refs --help` output.
3. Review existing open bug tickets with `tk list` to avoid duplicating known issues.
4. Explore the `examples/` folder for files with NL content containing backtick references.

## What to test

`satsuma nl-refs [path]` extracts backtick references from NL transform bodies.

Test areas:
- **Basic backtick refs**: NL string containing `` `field_name` ``. Extracted?
- **Multiple refs in one string**: `` "Sum `amount` grouped by `customer_id`" ``. Both extracted?
- **Schema-qualified refs**: `` `schema_name.field_name` ``. Extracted with dot path?
- **Namespace-qualified refs**: `` `crm::customers.name` ``. Extracted?
- **Refs in note blocks**: `` note { "See `other_schema` for details" } ``. Extracted?
- **Refs in inline notes**: `` (note "Based on `source_field`") ``. Extracted?
- **Refs in comments**: `` //! Watch out for `field_name` ``. Are comment backtick refs extracted?
- **Refs in triple-quoted strings**: `` """See `field` for more""" ``. Extracted?
- **No backtick refs**: NL content without any backtick references. Exit code? Output?
- **`--json` flag**: Valid JSON? Each ref includes: the reference text, the containing block, file, line?
- **Resolution status**: Does output indicate whether each ref resolves to a known identifier?
- **Nested backticks**: Edge case — `` "Check `record.`nested_field`` " ``. How handled?
- **Empty backticks**: `` "Something `` here" ``. How handled?
- **Cross-file**: Refs across multiple files all collected?
- **Single file path**: Works with a single file argument?
- **Ref in mapping vs schema vs metric**: Refs in different block types. Context preserved?
- **Duplicate refs**: Same backtick reference appears multiple times. All occurrences listed?

## Creating test fixtures

Create all temporary test files under `/tmp/satsuma-test-nl-refs/`. Construct files with diverse backtick reference patterns in NL content.

## Logging bugs

When you find a bug:
1. Check `tk list` for existing tickets describing the same issue.
2. If no duplicate exists, create a ticket:
   ```bash
   tk create "nl-refs: <concise bug title>" \
     -t bug \
     -d "<detailed description including:
     - What you did (exact command)
     - What you expected
     - What actually happened (paste actual output)
     - Path to the test file that reproduces it>"
   ```
3. Tag it with `--tags cli,nl-refs,exploratory-testing`.

## Rules

- **Do not fix bugs.** Only log them.
- **Do not modify any existing files** in the repo. Only create files in `/tmp/`.
- Be systematic and paste actual CLI output in tickets.
