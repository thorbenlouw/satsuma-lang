# AGENTS.md

## Project Summary

STM is a domain-specific language for source-to-target data mapping. The repository currently centers on the language specification, examples, and planning for tooling such as a parser, linter, formatter, visualizer, and editor support.

The immediate implementation priority is parser-first tooling. Downstream tools should be built on a correct, well-tested parser and stable AST/CST conventions rather than ad hoc text processing.

## Repository Layout

- `STM-SPEC.md`: authoritative language specification
- `PROJECT-OVERVIEW.md`: product vision, motivation, and roadmap
- `IMPLEMENTATION-GUIDE.md`: technical architecture and tooling strategy
- `AI-AGENT-REFERENCE.md`: compact grammar and agent-oriented STM guidance
- `examples/`: canonical `.stm` examples and fixtures
- `features/`: feature plans and task breakdown inputs
- `scripts/`: utility scripts used during development
- `tooling/tree-sitter-stm/`: tree-sitter grammar, generated parser artifacts, and corpus tests

## Platform Lineage Entry Point

When reasoning about lineage across a multi-file data platform, look for a **workspace file** (a `.stm` file containing a `workspace` block). The workspace file is the canonical entry point for platform-wide lineage traversal — it maps namespace names to source files and resolves name collisions between identically-named schemas in different projects.

```stm
// platform.stm — the entry point
workspace "data_platform" {
  schema "crm"       from "crm/pipeline.stm"
  schema "billing"   from "billing/pipeline.stm"
  schema "warehouse" from "warehouse/ingest.stm"
}
```

Use `stm lineage <workspace-file>` (future tooling) to generate the full platform graph. When building lineage analysis, start by finding and parsing the workspace file, then follow `schema ... from ...` entries to resolve all namespaces.

## Source of Truth

When making changes or answering questions about syntax, semantics, or supported constructs:

1. Treat `STM-SPEC.md` as the primary authority.
2. Use `examples/` as the executable corpus of valid language patterns.
3. Use `IMPLEMENTATION-GUIDE.md` and feature docs to guide tooling order and architecture.
4. If docs conflict, prefer the spec and call out the mismatch explicitly.

## Engineering Expectations

- Preserve STM readability for both humans and machines.
- Prefer parser-backed solutions over regex or line-oriented heuristics.
- Keep CST/AST naming intentional and stable for downstream consumers.
- Add or update tests with every behavior change.
- Use the example corpus as golden fixtures whenever possible.
- Document any ambiguity, unsupported syntax, or recovery behavior near the implementation.

## Shell Command Expectations

Always use non-interactive flags with shell commands that may prompt for confirmation. Agent work must not hang waiting for terminal input from aliased or interactive defaults.

Use forms like:

```bash
cp -f source dest
mv -f source dest
rm -f file
rm -rf directory
cp -rf source dest
scp -o BatchMode=yes ...
ssh -o BatchMode=yes ...
apt-get -y ...
HOMEBREW_NO_AUTO_UPDATE=1 brew ...
```

Prefer these forms over prompt-prone variants such as plain `cp`, `mv`, or `rm`.

## Testing Expectations

- New parser or tooling work must include targeted tests and fixture coverage.
- Valid syntax changes should add or update canonical examples or corpus fixtures.
- Invalid or recovery-sensitive behavior should include malformed input tests.
- Avoid merging parser work that is only manually verified.

## Running tree-sitter Commands

Use the repo-local wrapper [`scripts/tree-sitter-local.sh`](/Users/thorben/dev/personal/stm/scripts/tree-sitter-local.sh) for every Tree-sitter command. It sets `XDG_CACHE_HOME` to a repo-local cache directory and uses a repo-local config file so agent runs do not depend on `~/.cache/tree-sitter` or global parser config.

Preferred forms:

```bash
./scripts/tree-sitter-local.sh parse -p tooling/tree-sitter-stm examples/common.stm --quiet
./scripts/tree-sitter-local.sh parse -p tooling/tree-sitter-stm examples/common.stm
cd tooling/tree-sitter-stm && ../../scripts/tree-sitter-local.sh test
cd tooling/tree-sitter-stm && ../../scripts/tree-sitter-local.sh generate
```

Agent requirements:

- Do not call bare `tree-sitter ...` commands when the wrapper can be used.
- Do not ask the user to run Tree-sitter commands just to work around cache/config path issues.
- When adding scripts or docs, point them at the wrapper instead of the global CLI.
- If a Tree-sitter command still fails after using the wrapper, report the concrete failure before falling back to a user handoff.

## Code Search with ast-grep

`ast-grep` (available as `ast-grep` in the environment) performs structural AST-based search and rewrite, backed by tree-sitter.

### When to use it

Prefer `ast-grep` over `grep` when you care about syntax structure, not text:

- **Searching `grammar.js`**: find rule definitions, specific combinators, or usages of a rule name without false positives from comments or strings.
- **Searching Python scripts** under `scripts/`: structural function-call or import searches.
- **Future STM linting**: once the grammar is registered as a custom language (see below), `ast-grep scan` can enforce structural rules over `.stm` files.

Use plain `Grep` when scanning corpus fixtures or other plain-text files — those aren't parsed as code.

### Quick patterns for grammar.js

```bash
# Find all seq() calls (and see their content)
ast-grep run -l js -p 'seq($$$)' tooling/tree-sitter-stm/grammar.js

# Find all choice() calls
ast-grep run -l js -p 'choice($$$)' tooling/tree-sitter-stm/grammar.js

# Find a specific property in the rules object
ast-grep run -l js -p 'transform_body: $_' tooling/tree-sitter-stm/grammar.js
```

Metavariables: `$NAME` matches a single node; `$$$` matches zero or more.

### Registering STM as a custom language (future)

When the grammar is stable enough for structural search and lint, create `sgconfig.yml` at the repo root:

```yaml
# sgconfig.yml
customLanguages:
  stm:
    libraryPath: tooling/tree-sitter-stm/build/stm.dylib  # or .so on Linux
    extensions: [stm]
    expandoChar: _
```

After building the dylib (`npm run build` in `tooling/tree-sitter-stm/`), `ast-grep run -l stm -p '...'` enables structural search over `.stm` files. This is also the foundation for a future STM linter implemented as `ast-grep scan` rules.

## Issue Tracking

This project uses a CLI ticket system for task management. Run `tk help` when you need to use it.


Expected workflow:

- Capture dependencies explicitly so ready work can be derived from the graph.
- Include clear acceptance criteria on every implementation task.
- Represent testing work inside the acceptance criteria or as dependent tasks when large enough to stand alone.
- Worktree and server sync is handled manually outside the agent workflow.

## Agent Workflow

- Read the relevant feature doc in `features/` before implementing planned work.
- Inspect existing examples and docs before making syntax or tooling assumptions.
- Keep changes scoped and directly tied to the current task.
- If a requested change would contradict the spec, stop and raise the conflict clearly.
- For work in `tooling/tree-sitter-stm/`, treat corpus tests in `tooling/tree-sitter-stm/test/corpus/` and generated parser artifacts as part of the implementation surface.
- When changing the tree-sitter grammar, update the grammar source, regenerate parser outputs as needed, and verify the corpus fixtures.


 ## Adding a New Feature

 1. Create `features/<feature-name>/PRD.md` describing the problem, success
    criteria, and acceptance tests before writing any code.
 2. Write failing tests first (TDD) where practical.
 3. Implement the smallest change that makes the tests pass. Always do the RIGHT thing, not the FAST thing, so never hack tests or add lint ignore rules because that's easier than fixing the underlying issue.
 6. Update `PROJECT_OVERVIEW.md` if the architecture changes.
