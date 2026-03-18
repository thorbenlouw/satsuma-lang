# TODO: STM CLI — LLM Context Slicer

Depends on Feature 08 (tree-sitter parser v2) being complete before Phase 2.

## Phase 0: Scaffold

- [ ] Create `tooling/stm-cli/` directory
- [ ] Init `package.json` with `bin: { stm: "./src/index.js" }`
- [ ] Add `tree-sitter` and `tree-sitter-stm` (local path dep on `../tree-sitter-stm`) to dependencies
- [ ] Set up basic CLI argument parser (use `commander` or `minimist`)
- [ ] Write `src/index.js` entry point that dispatches to command modules
- [ ] Add `README.md` with usage examples for each command

## Phase 1: Workspace loader and CST index

Before commands can be built, the index layer must exist.

- [ ] `src/workspace.js` — finds all `.stm` files in a directory tree (`glob` or manual `fs.walk`)
- [ ] `src/parser.js` — initialises tree-sitter with the STM grammar, parses a single file, returns CST root
  - [ ] On parse error: collect error nodes, report `file:line parse error`, mark file as errored, continue
- [ ] `src/extract.js` — walks a CST and extracts the index:
  - [ ] `extractSchemas(root)` → `[{ name, file, metadata, fields, notes }]`
  - [ ] `extractMetrics(root)` → `[{ name, displayLabel, file, metadata, fields, notes }]`
  - [ ] `extractMappings(root)` → `[{ name, file, metadata, sources, target, arrows, notes }]`
  - [ ] `extractFragments(root)` → `[{ name, file, fields }]`
  - [ ] `extractTransforms(root)` → `[{ name, file, body }]`
  - [ ] `extractWarnings(root)` → `[{ file, block, text }]`
  - [ ] `extractQuestions(root)` → `[{ file, block, text }]`
- [ ] `src/index-builder.js` — runs workspace loader + parser + extract across all files, merges into a single `WorkspaceIndex` object
- [ ] `WorkspaceIndex` structure:
  ```js
  {
    schemas: Map<name, SchemaRecord>,
    metrics: Map<name, MetricRecord>,
    mappings: Map<name, MappingRecord>,
    fragments: Map<name, FragmentRecord>,
    transforms: Map<name, TransformRecord>,
    warnings: WarningRecord[],
    questions: QuestionRecord[],
    // derived:
    referenceGraph: Map<schemaName, { usedAsSourceIn, usedAsTargetIn, usedInMetrics, spreadInto }>
  }
  ```
- [ ] Build `referenceGraph` from mappings (sources/targets) and metrics (source metadata) during index build
- [ ] Write unit tests for `extract.js` against the examples corpus

## Phase 2: `stm summary`

- [ ] Implement `src/commands/summary.js`
- [ ] Default output: schemas section, metrics section, mappings section, fragments line, transforms line
- [ ] For each schema: name, field count, PII fields (if any), key metadata tokens (scd, fact, dimension, etc.)
- [ ] For each metric: name, display label, source schemas, grain
- [ ] For each mapping: name, source schema(s), target schema, arrow count
- [ ] `--compact`: names only, no counts or metadata callouts
- [ ] `--json`: full structured output
- [ ] Test: run against `examples/` and verify no crash, output looks correct

## Phase 3: `stm schema`

- [ ] Implement `src/commands/schema.js`
- [ ] Reconstruct schema declaration from index (not raw text — use CST node positions to re-emit)
- [ ] Include nested `record`/`list` blocks with correct indentation
- [ ] Include field notes if present
- [ ] `--compact`: omit all `note` tokens and NL strings from metadata
- [ ] `--fields-only`: one line per field — name, type, and key metadata tokens only
- [ ] `--json`: structured field list
- [ ] Error: exit 1 with message if schema name not found
- [ ] Test: `stm schema customers`, `stm schema legacy_sqlserver` against examples

## Phase 4: `stm metric`

- [ ] Implement `src/commands/metric.js`
- [ ] Reconstruct metric block from index: keyword, name, display label, metadata, measure fields, notes
- [ ] Format multi-line metadata block when more than 2 metadata entries
- [ ] `--compact`: omit note blocks
- [ ] `--sources`: print only source schema names (one per line)
- [ ] `--json`: structured metric record
- [ ] Error: exit 1 if metric not found
- [ ] Test: `stm metric monthly_recurring_revenue` against examples

## Phase 5: `stm mapping`

- [ ] Implement `src/commands/mapping.js`
- [ ] Reconstruct mapping block: header, source/target blocks, note, arrows
- [ ] Arrows: emit `src_path -> tgt_path` with transform body if present
- [ ] `--compact`: omit transform bodies and note blocks; just the arrow list
- [ ] `--arrows-only`: table of `src -> tgt`, no transform bodies
- [ ] `--json`: structured mapping record with arrow array
- [ ] Error: exit 1 if mapping not found
- [ ] Test: `stm mapping 'customer migration'` against examples

## Phase 6: `stm find`

- [ ] Implement `src/commands/find.js`
- [ ] `--tag <token>`: search all fields in all schemas, metrics, and mappings for matching `tag_token` or key in `key_value_pair`
  - [ ] Simple token: exact match against `tag_token` names
  - [ ] Multi-word: match against the sequence (e.g. `scd type 2`)
- [ ] Output: `schema.field  (matching metadata tokens)`, grouped by schema/metric
- [ ] `--in schemas|metrics|fields|mappings`: restrict search scope
- [ ] `--compact`: paths only, no metadata context
- [ ] `--json`: array of `{ file, block, blockType, field, matchedMetadata }`
- [ ] Test: `stm find --tag pii`, `stm find --tag pk`, `stm find --tag measure`

## Phase 7: `stm lineage`

- [ ] Implement `src/commands/lineage.js`
- [ ] Use `referenceGraph` from index (built in Phase 1)
- [ ] `--from <schema>`: walk downstream — find all mappings where this schema is a source, then their targets, recursively up to `--depth`
- [ ] Also emit: metrics that list this schema as a source
- [ ] `--to <schema>`: find path(s) from `--from` to `--to` (BFS over mapping graph)
- [ ] `--depth <n>`: limit recursion depth (default: unlimited for `--from`, implied for `--to`)
- [ ] Default output: indented tree
- [ ] `--compact`: schema and mapping names only, no descriptions
- [ ] `--json`: DAG as `{ nodes, edges }` where edges have `{ from, to, via, type }`
  - [ ] `type` is `mapping` or `metric`
- [ ] Error: exit 1 if named schema not found in index
- [ ] Test: lineage from `legacy_sqlserver`, from `fact_subscriptions`

## Phase 8: `stm where-used`

- [ ] Implement `src/commands/where-used.js`
- [ ] Accepts a name (schema, fragment, or transform)
- [ ] Looks up `referenceGraph` for schema references
- [ ] For fragments: finds all `fragment_spread` nodes in the CST that reference this name
- [ ] For transforms: finds all `fragment_spread` nodes inside arrow bodies
- [ ] Output: grouped by usage type (source in mapping, target in mapping, spread into schema, source in metric)
- [ ] `--json`: structured reference list

## Phase 9: `stm warnings`

- [ ] Implement `src/commands/warnings.js`
- [ ] Pull from `WorkspaceIndex.warnings` (extracted in Phase 1)
- [ ] Format: `file:block.field   //! comment text`
- [ ] `--questions`: show `WorkspaceIndex.questions` instead
- [ ] `--json`: array of `{ file, block, field, text, kind }`

## Phase 10: `stm context`

- [ ] Implement `src/commands/context.js`
- [ ] Input: free-text description string
- [ ] Scoring: for each block in the index, compute a relevance score based on:
  - [ ] Block name appears in description (high weight)
  - [ ] Field name appears in description (medium weight)
  - [ ] Note text contains description words (low weight)
  - [ ] Metadata token appears in description (low weight)
- [ ] Rank blocks by score, emit highest-scoring blocks up to token budget
- [ ] Token estimation: `Math.ceil(text.length / 4)` as rough approximation
- [ ] `--compact`: apply `--compact` to all emitted blocks
- [ ] `--budget <n>`: stop emitting blocks when cumulative estimated token count > n (default: 4000)
- [ ] `--json`: array of `{ block, score, content }` sorted by score descending
- [ ] Test: `stm context "add a PII field to the customer schema"` should surface `schema customers` and the customer migration mapping

## Phase 11: Error handling and polish

- [ ] Consistent exit codes: 0 = success, 1 = not found / no results, 2 = parse/filesystem error
- [ ] All commands: `--help` with usage and flag descriptions (via `commander`)
- [ ] Top-level `stm --help` lists all commands with one-line descriptions
- [ ] `stm --version` prints package version
- [ ] On workspace load errors: print parse errors to stderr, continue with valid files
- [ ] Ambiguous name (same name in multiple files): warn and show all matches

## Phase 12: End-to-end tests

- [ ] Write integration tests in `tooling/stm-cli/test/` using the `examples/` directory as fixture
- [ ] Test each command with valid input and verify output structure
- [ ] Test each command with an unknown name and verify exit code 1
- [ ] Test `stm find --tag pii` returns all expected PII fields from examples
- [ ] Test `stm lineage --from legacy_sqlserver` returns the correct downstream path
- [ ] Test `stm summary --json` is valid JSON with correct block counts
- [ ] Test `stm context "customer pii migration"` surfaces the customer migration mapping

## Acceptance checklist

- [ ] All commands run against `examples/` with no crashes
- [ ] `stm summary --compact` output for examples is under 2,000 estimated tokens
- [ ] `stm find --tag pii` finds all PII fields in examples
- [ ] `stm lineage --from legacy_sqlserver` produces a correct graph
- [ ] `stm metric monthly_recurring_revenue` outputs correct metric block
- [ ] `stm context` surfaces relevant blocks for a natural-language description
- [ ] All commands support `--json` and produce valid JSON
- [ ] Exit codes are correct for success, not-found, and parse errors
