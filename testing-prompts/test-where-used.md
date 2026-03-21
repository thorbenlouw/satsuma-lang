# Exploratory Testing: `satsuma where-used`

## Context

You are an exploratory QA agent for the Satsuma CLI. Your job is to thoroughly test the `satsuma where-used` subcommand, find bugs, and log them as tickets. **Do not fix any bugs — only report them.**

## Setup

1. Read these files to understand the language and CLI contract:
   - `AI-AGENT-REFERENCE.md` — compact grammar and cheat sheet
   - `SATSUMA-CLI.md` — full CLI command reference
   - `SATSUMA-V2-SPEC.md` — authoritative language specification
2. Read the `satsuma where-used --help` output.
3. Review existing open bug tickets with `tk list` to avoid duplicating known issues.
4. Explore the `examples/` folder for schemas, fragments, and transforms that reference each other.

## What to test

`satsuma where-used <name> [path]` finds all references to a schema, fragment, or transform.

Test areas:
- **Schema in source/target**: Schema referenced in `source { \`schema\` }` or `target { \`schema\` }` blocks.
- **Fragment spreads**: Fragment referenced via `...fragment_name`. Found?
- **Transform spreads**: Named transform referenced via `...transform_name` in mapping bodies.
- **Import references**: Schema or fragment referenced in `import { name } from "file.stm"`.
- **Metric source references**: Schema referenced as `source schema_name` in metric metadata.
- **NL backtick references**: Schema or field names in backtick references inside NL strings. Are these surfaced?
- **Cross-file references**: Name used in a different file from its definition.
- **Namespace-qualified references**: `crm::customers` references.
- **Quoted names**: Fragments or schemas with quoted labels like `'Common Fields'`.
- **No references**: Name that exists but is never referenced elsewhere. Exit code?
- **Non-existent name**: Name that doesn't exist at all. Exit code? Message?
- **`--json` flag**: Valid JSON with reference locations and types?
- **Multiple reference types**: Same name used as source, in NL, and in import. All listed?
- **Self-reference**: Schema that references itself somehow.
- **Case sensitivity**: Is lookup case-sensitive?
- **Ref metadata**: `(ref schema.field)` — is this caught as a reference?

## Creating test fixtures

Create all temporary test files under `/tmp/satsuma-test-where-used/`. Build files with cross-references of every type.

## Logging bugs

When you find a bug:
1. Check `tk list` for existing tickets describing the same issue.
2. If no duplicate exists, create a ticket:
   ```bash
   tk create "where-used: <concise bug title>" \
     -t bug \
     -d "<detailed description including:
     - What you did (exact command)
     - What you expected
     - What actually happened (paste actual output)
     - Path to the test file that reproduces it>"
   ```
3. Tag it with `--tags cli,where-used,exploratory-testing`.

## Rules

- **Do not fix bugs.** Only log them.
- **Do not modify any existing files** in the repo. Only create files in `/tmp/`.
- Be systematic and paste actual CLI output in tickets.
