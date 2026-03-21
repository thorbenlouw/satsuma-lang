# Bug Fix Plan: Exploratory Testing Results

85 bugs found across all 19 CLI subcommands, grouped into 18 clusters with dependency ordering for parallel agent work.

## Epic Tickets

| Epic ID | Cluster | Priority | Bugs | Phase |
|---------|---------|----------|------|-------|
| `sl-cdvp` | FieldDecl metadata enrichment | P0 | Foundation | 1 |
| `sl-m02g` | Line number indexing consistency | P0 | 4 | 1 |
| `sl-jt7q` | Nested record/list handling | P1 | 8 | 2 |
| `sl-42ev` | Fragment spread blindness | P1 | 6 | 2 |
| `sl-armj` | JSON output missing data | P1 | 13 | 2 |
| `sl-0ycs` | Exit code consistency | P1 | 7 | 3 |
| `sl-x11k` | JSON error response format | P1 | 4 | 3 |
| `sl-z4ya` | Nested arrow handling | P1 | 6 | 3 |
| `sl-4m85` | Text output fidelity | P2 | 6 | 3 |
| `sl-m4l5` | Filter flags not affecting --json | P2 | 4 | 3 |
| `sl-wvn8` | NL extraction gaps | P2 | 7 | 3 |
| `sl-7i7j` | Validate coverage gaps | P2 | 9 | 3 |
| `sl-mkuw` | where-used coverage gaps | P2 | 4 | 3 |
| `sl-btgr` | Metadata/arrow visibility | P2 | 4 | 4 |
| `sl-cyen` | diff command gaps | P2 | 6 | 4 |
| `sl-eoco` | context search coverage | P2 | 4 | 4 |
| `sl-6hot` | Lineage/graph edge cases | P2 | 5 | 4 |
| `sl-niix` | Lint edge cases | P3 | 3 | 5 |
| `sl-xh3b` | Misc standalone bugs | P3 | 12 | 5 |

## Phase Execution Plan

### Phase 1: Foundation (sequential, do first)

These are small changes with high blast radius — many downstream fixes depend on them.

**FieldDecl metadata enrichment (`sl-cdvp`)** — Extend `FieldDecl` in `types.ts` with a metadata array. Update `extractFieldTree`/`extractDirectFields` in `extract.ts` to populate it. This single change unblocks clusters 3, 7, 8, 15, and several misc bugs.

Key files: `tooling/satsuma-cli/src/types.ts`, `tooling/satsuma-cli/src/extract.ts`

**Line number indexing (`sl-m02g`)** — Decide on 1-indexed convention (matching human expectations), then fix `find`, `nl`, `graph`, and `nl-refs`. Trivial per-command: add `+ 1` to tree-sitter's 0-indexed `row`.

Bugs: `sl-n96y`, `sl-6mlu`, `sl-z3eg`, `sl-5erh`

---

### Phase 2: Core extraction fixes (3 agents in parallel)

All depend on Phase 1's FieldDecl enrichment.

#### Agent A: Nested record/list (`sl-jt7q`)

Fix order:
1. `sl-1ugo` — fields text: show nested children (establishes rendering pattern)
2. `sl-gf8d` — fields --with-meta: include nested child metadata
3. `sl-giss` — meta: include metadata on record/list blocks
4. `sl-bfue` — meta: support `schema.record.field` paths
5. `sl-3nrg` — nl: attribute record/list notes to correct parent
6. `sl-s8xn` — schema: include record/list block-level metadata
7. `sl-4mh2` — fields --unmapped-by: handle partially-mapped records
8. `sl-zqqu` — diff: detect nested field changes (cross-dep on diff epic)

#### Agent B: Fragment spread blindness (`sl-42ev`)

Fix order:
1. `sl-idbf` — validate: catch undefined fragment spreads (foundational)
2. `sl-z6z9` — find: include tagged fields from spreads
3. `sl-f152` — meta: find fields from spreads
4. `sl-z9us` — fields --with-meta: include spread field metadata
5. `sl-vlsh` — summary: count spread fields in fieldCount
6. `sl-yibt` — graph: populate fragment node fields

#### Agent C: JSON output missing data (`sl-armj`)

Fix in any order (all independent once FieldDecl metadata exists):
- `sl-rbvk` — schema --json: include field metadata
- `sl-pq65` — schema: include non-note schema-level metadata
- `sl-5pa2` — schema --json: include namespace in name
- `sl-shwl` — mapping --json: include arrow classification
- `sl-ari1` — mapping --json: include transform body
- `sl-0x23` — mapping: include mapping-level metadata
- `sl-x8yp` — mapping --json: include namespace in name
- `sl-09bo` — metric --json: include namespace
- `sl-i1b8` — metric --json: include field metadata (depends on `sl-rbvk` pattern)
- `sl-xifk` — metric --json: include notes
- `sl-se2f` — metric: include slice metadata
- `sl-tkex` — summary --json: include fileCount

---

### Phase 3: Command-level fixes (4-5 agents in parallel)

#### Agent D: Exit codes + JSON errors (`sl-0ycs` + `sl-x11k`)

All straightforward. `errors.ts` already defines `EXIT_NOT_FOUND = 1`.

Exit codes (any order): `sl-cthr`, `sl-u0ev`, `sl-fs3a`, `sl-ht9n`, `sl-ivel`, `sl-la5z`, `sl-fzfx`
JSON errors (any order): `sl-l83d`, `sl-i47e`, `sl-vojd`, `sl-rks7`

#### Agent E: Text fidelity + filter flags (`sl-4m85` + `sl-m4l5`)

Text fidelity:
1. `sl-c2zf` — schema: preserve single quotes on labels
2. `sl-21n1` — schema: preserve backticks on field identifiers
3. `sl-0um5` — metric: quote multi-word names
4. `sl-l4q0` — mapping: strip backticks consistently in JSON
5. `sl-i956` — schema: include comments in text output
6. `sl-c1he` — metric: include comments in text output

Filter flags (any order): `sl-86n4`, `sl-5fbn`, `sl-vexa`, `sl-vfbv`

#### Agent F: NL extraction (`sl-wvn8`)

Fix order:
1. `sl-6ino` — nl: set parent for transform_block items
2. `sl-vw49` — nl: fix scope resolution when schema/mapping share name
3. `sl-gu24` — nl: extract all concatenated strings in note blocks
4. `sl-j014` — nl: unescape `\"` and `\\` in extracted strings
5. `sl-3dd2` — nl-refs: extract from standalone transform blocks
6. `sl-z57o` — nl-refs: extract from note blocks in mappings
7. `sl-djeo` — nl-refs: fix line numbers in multiline strings

#### Agent G: Validate + where-used (`sl-7i7j` + `sl-mkuw`)

Validate fix order:
1. `sl-w6yu` — unclosed schema at EOF (parser-level)
2. `sl-icqz` — target-only mapping parse error (parser-level)
3. `sl-1s81` — catch undefined transform spreads
4. `sl-t5k4` — catch undefined import names
5. `sl-bhpv` — include import warnings in diagnostics/JSON
6. `sl-313n` — validate metric source references
7. `sl-7vbb` — validate ref metadata references
8. `sl-7a1f` — fix field-not-in-schema cross-contamination
9. `sl-rks7` — fix --errors-only to keep semantic errors (also in cluster 2)

where-used (any order): `sl-iw85`, `sl-izap`, `sl-vtld`, `sl-7yoa`

#### Agent H: Nested arrows (`sl-z4ya`)

Fix order:
1. `sl-wjb9` — mapping: include nested arrow children in output
2. `sl-ezpm` — mapping: reconcile arrowCount with arrows array
3. `sl-ij5p` — mapping: fix unnamed mapping empty arrows
4. `sl-9gvb` — arrows: make nested children visible to field lookup
5. `sl-4e5c` — graph: fix corrupted nested arrow edge paths
6. `sl-531q` — arrows: fix JSON source field attribution

---

### Phase 4: Higher-level features (2 agents in parallel)

Depend on Phases 1-3 for nested, metadata, and JSON fixes.

#### Agent I: diff + arrow metadata (`sl-cyen` + `sl-btgr`)

diff fix order (all depend on `sl-ck20`):
1. `sl-ck20` — expand Delta type to include metrics, fragments, transforms
2. `sl-6gta` — detect field metadata changes
3. `sl-o4wq` — detect transform body changes
4. `sl-h13n` — report individual arrow additions/removals
5. `sl-18hw` — detect note block changes

Arrow/meta visibility (any order): `sl-9xiz`, `sl-6ctd`, `sl-in1y`, `sl-2x93`

#### Agent J: context + lineage/graph (`sl-eoco` + `sl-6hot`)

context (any order): `sl-8zij`, `sl-1nyd`, `sl-mdlr`, `sl-p683`

lineage/graph fix order:
1. `sl-3url` — fix multiple-target mapping recognition
2. `sl-iliz` — fix --depth --json missing nodes
3. `sl-lmcp` — fix --to --depth path truncation
4. `sl-n11t` — fix schema_edges NL source leak
5. `sl-w4hv` — fix --schema-only edges for derived arrows

---

### Phase 5: Polish (any order, lowest priority)

**Lint (`sl-niix`)**: `sl-0o1x`, `sl-z157`, `sl-td9l`

**Misc (`sl-xh3b`)**: `sl-d8h5`, `sl-c7yn`, `sl-e6su`, `sl-qx8n`, `sl-amyh`, `sl-1f9d`, `sl-io70`, `sl-u2qa`, `sl-eglw`, `sl-3o9n`, `sl-g4u2`

Note: `sl-qx8n`, `sl-amyh`, `sl-io70` depend on Phase 1 FieldDecl enrichment.

---

## Parallelism Map

```
Phase 1 (sequential):   [FieldDecl enrichment]  [Line numbers]
                                 |
Phase 2 (3 parallel):   [A: Nested]  [B: Spreads]  [C: JSON data]
                                 |
Phase 3 (5 parallel):   [D: Exit codes]  [E: Text/flags]  [F: NL]  [G: Validate]  [H: Nested arrows]
                                 |
Phase 4 (2 parallel):   [I: Diff + arrow meta]  [J: Context + lineage]
                                 |
Phase 5 (any):          [Lint]  [Misc]
```

## Key Files

| File | Clusters affected |
|------|-------------------|
| `types.ts` | FieldDecl (all), Delta (diff) |
| `extract.ts` | FieldDecl, nested, arrows, metadata |
| `meta-extract.ts` | metadata enrichment, meta command |
| `spread-expand.ts` | fragment spreads across all commands |
| `nl-extract.ts` | NL extraction, parent attribution |
| `nl-ref-extract.ts` | NL refs, column/line numbers |
| `classify.ts` | arrow classification (arithmetic) |
| `errors.ts` | exit codes, JSON error format |
| `diff.ts` | all diff cluster bugs |
| `graph-builder.ts` | graph/lineage edge cases |
| `validate.ts` | all validate coverage bugs |
| `commands/*.ts` | per-command output formatting |
