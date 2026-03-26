# AGENTS.md

## Project Summary

Satsuma is a domain-specific language for source-to-target data mapping. The repository contains the language specification, a canonical example corpus, a tree-sitter parser, a 16-command CLI for structural extraction and validation, and a VS Code syntax highlighting extension.

All tooling is parser-backed. Downstream tools should be built on the tree-sitter CST and stable AST conventions rather than ad hoc text processing.

## Repository Layout

- `SATSUMA-V2-SPEC.md`: authoritative language specification (v2)
- `PROJECT-OVERVIEW.md`: product vision, motivation, and roadmap
- `SATSUMA-CLI.md`: CLI command reference (16 commands)
- `AI-AGENT-REFERENCE.md`: compact grammar and agent-oriented Satsuma guidance (v2) — also available via `satsuma agent-reference`
- `HOW-DO-I.md`: question-based index to all guides and conventions
- `ROADMAP.md`: deferred work items, ideas, and convention docs still to write
- `examples/`: canonical `.stm` examples and fixtures (v2 syntax)
- `archive/v1/`: archived v1 specification and examples — for historical reference only, not for new work
- `archive/features/`: completed feature specs (12 features) — for historical reference only
- `features/`: active feature plans (5 features with open work)
- `useful-prompts/`: self-contained system prompts for web LLMs (Excel-to-Satsuma, Satsuma-to-Excel)
- `skills/`: Agent Skills following the [agentskills.io](https://agentskills.io) standard (Excel-to-Satsuma conversion skill, Satsuma-to-Excel export skill)
- `scripts/`: utility scripts used during development
- `tooling/tree-sitter-satsuma/`: tree-sitter grammar (482 corpus tests), generated parser artifacts, and queries
- `tooling/satsuma-cli/`: TypeScript CLI tool for workspace extraction, validation, and structural analysis (637 tests)
- `tooling/vscode-satsuma/`: VS Code extension with LSP server (semantic tokens, diagnostics, go-to-definition, find-references, completions, hover, rename, code lens, folding, document symbols) and TextMate grammar

## Platform Lineage Entry Point

When reasoning about lineage across a multi-file data platform, look for a **platform entry point file** that uses `import` with namespace-qualified names to pull definitions from across the platform. This is the canonical entry point for platform-wide lineage traversal.

```satsuma
// platform.stm — the entry point
import { crm::customers, crm::orders } from "crm/pipeline.stm"
import { billing::invoices } from "billing/pipeline.stm"
import { warehouse::inventory } from "warehouse/ingest.stm"
```

Use `satsuma lineage --from <schema> <dir>` to trace data flow through the platform. See `features/15-namespaces/PRD.md` for the full namespace specification.

## Source of Truth

When making changes or answering questions about syntax, semantics, or supported constructs:

1. Treat `SATSUMA-V2-SPEC.md` as the primary authority. The v1 spec is archived at `archive/v1/STM-SPEC.md` — do not use it for new work.
2. Use `examples/` as the executable corpus of valid language patterns (v2 syntax).
3. Use feature docs in `features/` to guide tooling order and architecture.
4. If docs conflict, prefer the spec and call out the mismatch explicitly.

## Engineering Expectations

- Preserve Satsuma readability for both humans and machines.
- Prefer parser-backed solutions over regex or line-oriented heuristics.
- Keep CST/AST naming intentional and stable for downstream consumers.
- Add or update tests with every behavior change.
- Use the example corpus as golden fixtures whenever possible.
- Document any ambiguity, unsupported syntax, or recovery behavior near the implementation.

## Security

CI runs `npm audit` and `gitleaks` secret scanning on every PR. Before pushing,
agents must also verify locally:

- **No secrets in commits.** Never commit API keys, tokens, passwords, or
  credentials. Check staged diffs for anything that looks like a secret before
  committing. If a secret is accidentally committed, alert the user immediately —
  do not just remove it in a follow-up commit (the value is already in git history).
- **No dependencies with critical vulnerabilities.** Run `npm audit` in any
  package directory where you added or updated dependencies. Do not merge work
  that introduces critical or high severity vulnerabilities without explicit
  user approval.
- **No `.env` or credential files.** Never stage `.env`, `credentials.json`,
  `*.pem`, or similar files. If these are needed for local development, ensure
  they are in `.gitignore`.

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

- Every task must end with the relevant automated tests run locally and passing before picking up the next task.
- Each task implementation must expand or update test coverage to match the behavior it adds or changes.
- Keep the repo commit hooks installed and passing; they should block commits when required validation or tests fail.
- New parser or tooling work must include targeted tests and fixture coverage.
- Valid syntax changes should add or update canonical examples or corpus fixtures.
- Invalid or recovery-sensitive behavior should include malformed input tests.
- Avoid merging parser work that is only manually verified.

## Running tree-sitter Commands

Use the repo-local wrapper [`scripts/tree-sitter-local.sh`](scripts/tree-sitter-local.sh) for every Tree-sitter command. It sets `XDG_CACHE_HOME` to a repo-local cache directory and uses a repo-local config file so agent runs do not depend on `~/.cache/tree-sitter` or global parser config.

Preferred forms:

```bash
./scripts/tree-sitter-local.sh parse -p tooling/tree-sitter-satsuma examples/common.stm --quiet
./scripts/tree-sitter-local.sh parse -p tooling/tree-sitter-satsuma examples/common.stm
cd tooling/tree-sitter-satsuma && ../../scripts/tree-sitter-local.sh test
cd tooling/tree-sitter-satsuma && ../../scripts/tree-sitter-local.sh generate
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
- **Future Satsuma linting**: once the grammar is registered as a custom language (see below), `ast-grep scan` can enforce structural rules over `.stm` files.

Use plain `Grep` when scanning corpus fixtures or other plain-text files — those aren't parsed as code.

### Quick patterns for grammar.js

```bash
# Find all seq() calls (and see their content)
ast-grep run -l js -p 'seq($$$)' tooling/tree-sitter-satsuma/grammar.js

# Find all choice() calls
ast-grep run -l js -p 'choice($$$)' tooling/tree-sitter-satsuma/grammar.js

# Find a specific property in the rules object
ast-grep run -l js -p 'transform_body: $_' tooling/tree-sitter-satsuma/grammar.js
```

Metavariables: `$NAME` matches a single node; `$$$` matches zero or more.

### Registering Satsuma as a custom language (future)

When the grammar is stable enough for structural search and lint, create `sgconfig.yml` at the repo root:

```yaml
# sgconfig.yml
customLanguages:
  satsuma:
    libraryPath: tooling/tree-sitter-satsuma/build/satsuma.dylib  # or .so on Linux
    extensions: [stm]
    expandoChar: _
```

After building the dylib (`npm run build` in `tooling/tree-sitter-satsuma/`), `ast-grep run -l satsuma -p '...'` enables structural search over `.stm` files. This is also the foundation for a future Satsuma linter implemented as `ast-grep scan` rules.

## Issue Tracking

This project uses a CLI ticket system for task management. Run `tk help` when you need to use it.


Expected workflow:

- Capture dependencies explicitly so ready work can be derived from the graph.
- Include clear acceptance criteria on every implementation task.
- Represent testing work inside the acceptance criteria or as dependent tasks when large enough to stand alone.
- **Before closing a ticket**, add a timestamped `## Notes` entry describing the root cause and the fix applied. Use the format:
  ```
  ## Notes

  **<ISO-8601 timestamp>**

  Cause: <1-2 sentences describing root cause>
  Fix: <1-2 sentences describing what was changed> (commit <short-sha>)
  ```
- Worktree and server sync is handled manually outside the agent workflow.

## Agent Workflow

- **All code changes must go through a PR.** Direct pushes to `main` are blocked.
  See [AGENT-CONTRIBUTIONS.md](AGENT-CONTRIBUTIONS.md) for the
  full contribution workflow including worktree setup, branch naming, and parallel
  work conventions.
- Use git worktrees in `.worktrees/` for feature isolation. Create one per feature
  branch so multiple agents can work in parallel without conflicts.
- **After creating a new worktree**, run `npm run install:all` from the worktree
  root to install all dependencies, build the WASM parser, and compile the LSP
  server. Without this step, pre-commit hooks will fail on vscode-satsuma and
  tree-sitter tests.
- Read the relevant feature doc in `features/` before implementing planned work.
- Inspect existing examples and docs before making syntax or tooling assumptions.
- Keep changes scoped and directly tied to the current task.
- **Always include `.tickets/` changes in every commit — no exceptions.** The `tk` tool stores task state there and it must stay in sync with the code. Stage `.tickets/` alongside your other changes before committing.
- Do not pick up the next task until the current task's relevant automated tests have been run locally and are passing.
- If a requested change would contradict the spec, stop and raise the conflict clearly.
- For work in `tooling/tree-sitter-satsuma/`, treat corpus tests in `tooling/tree-sitter-satsuma/test/corpus/` and generated parser artifacts as part of the implementation surface.
- When changing the tree-sitter grammar, update the grammar source, regenerate parser outputs as needed, and verify the corpus fixtures.


 ## Adding a New Feature

 1. Create `features/<feature-name>/PRD.md` describing the problem, success
    criteria, and acceptance tests before writing any code.
 2. Write failing tests first (TDD) where practical.
 3. Implement the smallest change that makes the tests pass. Always do the RIGHT thing, not the FAST thing, so never hack tests or add lint ignore rules because that's easier than fixing the underlying issue.
 6. Update `PROJECT_OVERVIEW.md` if the architecture changes.

## Ralph Loops
When you are implementing a whole feature in a Ralph Loop, and have finished all related tk (ticket) tasks such that there are no remaining ready tasks, emit <PROMISE>DONE</PROMISE> to signal completion of the feature.

* Commit your changes after each tk task completes (AND after you have proven that tests are passing and you have added any new coverage and documentation updates).
