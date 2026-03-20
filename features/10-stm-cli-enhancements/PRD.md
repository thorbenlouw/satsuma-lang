# Feature 10 — Satsuma CLI: Structural Primitives for Agent Composition

> **Status: COMPLETED** (2026-03-18). All structural primitive commands (arrows, nl, meta, fields, match-fields, validate, diff) implemented and tested.

## Goal

Extend the `satsuma` CLI (Feature 09) with low-level structural extraction commands that agents use as building blocks. Every new command produces 100% deterministically correct results from the parse tree. The agent — not the CLI — composes these primitives into higher-level workflows like impact analysis, coverage assessment, and audit.

---

## Problem

Feature 09 built a set of workspace-level extractors (summary, schema, mapping, lineage, etc.) that let agents navigate Satsuma efficiently. But agents performing deeper workflows — tracing a field through mappings, checking whether a target is fully covered, assessing what changed between versions — still need to pull entire blocks into context and do the cross-referencing themselves.

What's missing is not smarter analysis commands. It's lower-level structural primitives that let the agent slice precisely:

1. **Arrow-level extraction.** "Give me every arrow involving this field" — not the whole mapping, just the arrows, with their transform content verbatim.
2. **NL content extraction.** "Give me the natural-language strings attached to this scope" — so the agent can read and interpret them, without pulling the entire schema or mapping.
3. **Metadata extraction.** "Give me the metadata on this block or field" — tags, notes, types, constraints, without surrounding structure.
4. **Field-level graph edges.** "What fields does this field connect to via arrows?" — the raw edges the agent traverses itself.
5. **Structural validation.** "Are there parse errors or broken references?" — the one genuinely end-to-end command, because structural correctness is fully deterministic.
6. **Structural diff.** "What structurally changed between these two versions?" — name/type/arrow comparison, no interpretation.

---

## Design Principles

1. **Every command is 100% deterministic.** If the CLI cannot produce a fully correct result from structural analysis alone, the command does not belong in the CLI. The agent composes primitives to perform workflows that require interpretation.
2. **The CLI extracts. The agent reasons.** NL content (transform bodies, notes, comments) is extracted verbatim and delivered to the agent. The CLI never interprets, summarizes, or judges NL content.
3. **No overclaiming.** Command names describe the structural operation, not the business workflow. `arrows`, not `impact`. `fields --unmapped`, not `coverage`. The agent decides what the results mean.
4. **Minimal output, maximum precision.** Each command returns exactly what was asked for. An agent building an impact analysis calls `arrows`, then `arrows` again on the result, composing the chain itself — it doesn't get a pre-assembled chain that might hide assumptions.
5. **`--json` everywhere.** Every command supports `--json` for programmatic consumption. Text output is for human readability; JSON output is the agent interface.

---

## The NL Boundary

Satsuma puts natural language in structurally meaningful positions: transform bodies (`{ "Normalize and deduplicate..." }`), notes (`(note "...")`), and comments (`//!`, `//?`). The CLI can parse the structure around NL content but cannot interpret its meaning.

Every arrow the CLI returns carries a **transform classification** derived purely from CST node types — no string content is examined:

| Classification | CST condition | Meaning |
|---|---|---|
| `structural` | All pipe steps are `token_call`, `map_literal`, or `fragment_spread` | Transform is a deterministic pipeline |
| `nl` | All pipe steps are `nl_string` or `multiline_string` | Transform is natural language — agent must interpret |
| `mixed` | Both structural and NL pipe steps present | Partially deterministic — agent reviews NL portion |
| `none` | No transform body (bare `src -> tgt`) | Direct mapping, no transformation |

Derived arrows (no source path) are flagged as `derived` alongside their transform classification.

This classification is a mechanical CST check. It tells the agent exactly where structural certainty ends and its own reasoning begins.

---

## Success Criteria

1. `satsuma arrows <schema.field>` returns all arrows involving a field with correct transform classification.
2. `satsuma nl <scope>` extracts all NL content within a scope with structural position info.
3. `satsuma meta <scope>` extracts metadata entries for any block or field.
4. `satsuma fields <schema> --unmapped-by <mapping>` correctly identifies fields with no arrows in a mapping.
5. `satsuma match-fields --source <s> --target <t>` returns correct exact-after-normalization matches.
6. `satsuma validate` reports all parse errors and semantic warnings with file/line/rule.
7. `satsuma diff <a> <b>` produces correct structural delta.
8. All commands support `--json`.
9. All commands follow exit code conventions: 0 = success, 1 = not found / no results, 2 = parse error.

---

## Commands

### `satsuma arrows <schema.field> [path]`

Extract all arrows from all mappings that involve a specific field as source or target. Returns verbatim arrow content with transform classification.

This is the most important new primitive. It is what the agent calls to build field-level lineage, assess coverage, and trace tag propagation — composing the chain itself rather than trusting a pre-assembled one.

```
$ satsuma arrows loyalty_sfdc.LoyaltyTier

loyalty_sfdc.LoyaltyTier — 1 arrow (as source)

  mapping 'sfdc to sat_customer_demographics':
    LoyaltyTier -> loyalty_tier { trim | lowercase }              [structural]

$ satsuma arrows mart_customer_360.email

mart_customer_360.email — 1 arrow (as target)

  mapping 'demographics to mart':
    email -> email { "Normalize and deduplicate against existing contacts" }   [nl]
```

**Flags:**
- `--as-source`: only arrows where the field is the source
- `--as-target`: only arrows where the field is the target
- `--json`: structured output with individual pipe steps decomposed

**JSON output:**

```json
[{
  "mapping": "sfdc to sat_customer_demographics",
  "source": "loyalty_sfdc.LoyaltyTier",
  "target": "sat_customer_demographics.loyalty_tier",
  "classification": "structural",
  "transform_raw": "trim | lowercase",
  "steps": [
    { "type": "token_call", "text": "trim" },
    { "type": "token_call", "text": "lowercase" }
  ],
  "derived": false,
  "file": "hub-customer.stm",
  "line": 95
}]
```

**Why 100% correct:** Every field comes directly from CST nodes. The classification is a mechanical check of pipe step node types. The transform text is verbatim from the parse tree.

---

### `satsuma nl <scope> [path]`

Extract all natural-language content within a scope. Returns the raw NL text with its structural position (what it's attached to).

Scope syntax: `schema <name>`, `mapping <name>`, `field <schema.field>`, or `all`.

```
$ satsuma nl mapping 'demographics to mart'

'demographics to mart' — 3 NL items

  email -> email:
    "Normalize and deduplicate against existing contacts"           (transform)
  -> full_name:
    "Concatenate first and last name with proper casing"            (transform, derived)
  block:
    (note "Maps customer demographics from vault to analytics mart") (note)

$ satsuma nl sat_customer_demographics.loyalty_tier

sat_customer_demographics.loyalty_tier — 1 NL item

  (note "Standardized tier values: bronze, silver, gold, platinum") (field note)
```

**Flags:**
- `--kind <type>`: filter to `note`, `warning`, `question`, `transform`
- `--json`: structured output with position info

**Why 100% correct:** Extracts verbatim text from CST `nl_string`, `multiline_string`, `note_block`, `note_tag`, `warning_comment`, and `question_comment` nodes. Position classification is from the CST node hierarchy.

---

### `satsuma meta <scope> [path]`

Extract metadata entries for a block or field. Returns all tags, key-value pairs, notes, enums, and constraints from the metadata parentheses.

Scope syntax: `<schema>` (block), `<schema.field>` (field), `<mapping>`, `<metric>`.

```
$ satsuma meta schema hub_customer

hub_customer metadata:
  note "Customer business key registry. Business key is the SFDC ContactId.
    POS and Shopify customers are resolved to an SFDC ContactId via
    loyalty card and email matching respectively."

$ satsuma meta loyalty_sfdc.Email

loyalty_sfdc.Email metadata:
  type: STRING(255)
  tags: pii

$ satsuma meta sat_customer_demographics.status

sat_customer_demographics.status metadata:
  type: VARCHAR(20)
  tags: required
  enum: { active, suspended, closed }
  default: active
```

**Flags:**
- `--tags-only`: just the tag tokens, one per line
- `--json`: structured metadata object

**Why 100% correct:** Metadata is fully structural — it's parsed from `metadata`, `meta_entry`, `tag_token`, `key_value_pair`, `enum_body`, and `note_tag` CST nodes. No interpretation needed.

---

### `satsuma fields <schema> [path]`

List all fields in a schema with their types and metadata. This is the field-level complement to `satsuma schema` — it returns structured field data rather than the full block reconstruction.

```
$ satsuma fields sat_customer_demographics

sat_customer_demographics — 16 fields

  first_name              VARCHAR(100)
  last_name               VARCHAR(100)
  email                   VARCHAR(255)
  phone                   VARCHAR(20)
  date_of_birth           DATE
  gender                  VARCHAR(20)
  address_line_1          VARCHAR(200)
  city                    VARCHAR(100)
  state_province          VARCHAR(50)
  postal_code             VARCHAR(20)
  country_code            CHAR(2)
  loyalty_tier            VARCHAR(20)
  loyalty_points          INTEGER
  preferred_store_id      VARCHAR(20)
  opt_in_email            BOOLEAN
  opt_in_sms              BOOLEAN
```

**Flags:**
- `--unmapped-by <mapping>`: list only fields that have no arrows in the named mapping. The agent uses this to check coverage — "which target fields does this mapping not yet cover?"
- `--with-meta`: include metadata tags on each field
- `--json`: structured field array

```
$ satsuma fields mart_customer_360 --unmapped-by 'demographics to mart'

mart_customer_360 — 7 fields not targeted by 'demographics to mart'

  has_online_account      BOOLEAN
  online_order_count      INTEGER
  online_lifetime_spend   DECIMAL(12,2)
  last_online_order_at    TIMESTAMPTZ
  online_account_age_days INTEGER
  customer_segment        VARCHAR(30)
  is_omnichannel          BOOLEAN
```

**Why 100% correct:** Field lists come from the CST. The `--unmapped-by` flag does a set difference between the schema's declared fields and the arrow target paths in the named mapping — pure structural comparison.

---

### `satsuma match-fields --source <schema> --target <schema> [path]`

Compare field names between two schemas using deterministic normalized string matching. Normalize = lowercase + strip `_` and `-`. Returns exact matches after normalization, source-only fields, and target-only fields.

No fuzzy scoring, no thresholds. A match is binary: the normalized strings are identical or they aren't.

```
$ satsuma match-fields --source loyalty_sfdc --target sat_customer_demographics

Exact matches after normalization (11):
  FirstName        ↔  first_name          (firstname)
  LastName         ↔  last_name           (lastname)
  Email            ↔  email               (email)
  Phone            ↔  phone               (phone)
  DateOfBirth      ↔  date_of_birth       (dateofbirth)
  Gender           ↔  gender              (gender)
  LoyaltyTier      ↔  loyalty_tier        (loyaltytier)
  LoyaltyPoints    ↔  loyalty_points      (loyaltypoints)
  PreferredStoreId ↔  preferred_store_id  (preferredstoreid)
  OptInEmail       ↔  opt_in_email        (optinemail)
  OptInSMS         ↔  opt_in_sms          (optinsms)

Source-only (7):
  ContactId, MailingStreet, MailingCity, MailingState,
  MailingPostalCode, MailingCountry, AccountCreatedDate

Target-only (5):
  address_line_1, city, state_province, postal_code, country_code
```

**Flags:**
- `--matched-only`: show only matches
- `--unmatched-only`: show only unmatched fields
- `--json`: structured output

**Why 100% correct:** Normalization is a deterministic string operation. Match is exact string equality after normalization. No heuristic, no scoring.

---

### `satsuma validate [path]`

Parse all `.stm` files and report structural errors and semantic warnings. This is the one genuinely end-to-end command — structural correctness is fully deterministic.

**Structural errors** (from tree-sitter):
- Parse errors with file, line, column, and surrounding context
- Missing required nodes (e.g. a mapping with no source/target declaration)

**Semantic warnings** (from index analysis):
- Schema referenced in a mapping source/target but never defined
- Fragment spread (`...name`) referencing a fragment that does not exist
- Transform spread referencing a transform that does not exist
- Duplicate schema/mapping/fragment names within the workspace
- Arrow source field not present in the declared source schema
- Arrow target field not present in the declared target schema
- Metric referencing a source schema that does not exist

```
$ satsuma validate

hub-customer.stm:45:3  error   unexpected token — expected field or '}'
hub-customer.stm:72:5  error   missing '->' in arrow
link-sale.stm:18:1     warn    schema 'pos_returns' referenced in mapping but not defined
common.stm             warn    fragment 'audit_fields' defined but never spread

2 errors, 2 warnings in 8 files
```

**Flags:**
- `--json`: array of `{ file, line, column, severity, rule, message }`
- `--errors-only`: suppress warnings
- `--quiet`: exit code only — 0 if clean, 2 if errors. Useful for CI gates.

**Why 100% correct:** Parse errors are from tree-sitter ERROR/MISSING nodes. Semantic checks are reference resolution against the workspace index — name exists or it doesn't.

---

### `satsuma diff <path-a> <path-b>`

Structural diff between two Satsuma files or directories. Compares schemas, fields, mappings, and arrows by name identity and structural content.

```
$ satsuma diff v1/hub-customer.stm v2/hub-customer.stm

schema hub_customer:
  + gender                VARCHAR(20)           (field added)
  ~ email                 VARCHAR(200) → VARCHAR(255)  (type changed)
  - fax_number            VARCHAR(20)           (field removed)

mapping 'sfdc to hub_customer':
  + loyalty_sfdc.Gender → hub_customer.gender   (arrow added)
  - loyalty_sfdc.FaxNumber → hub_customer.fax_number  (arrow removed)
```

**Flags:**
- `--json`: structured delta object
- `--names-only`: list changed block names only
- `--stat`: summary counts (schemas changed, fields added/removed/changed, arrows added/removed)

**Why 100% correct:** Two workspace indexes are compared. A field is "changed" if its type string or metadata differs. An arrow is "changed" if its source, target, or transform text differs. Pure structural comparison.

---

## How Agents Compose These Primitives

The CLI does not have `impact`, `coverage`, `audit`, `scaffold`, or `inventory` commands. The agent builds these workflows from primitives. Here's how:

### Impact analysis

The agent traces a field through the arrow graph:

```
1. satsuma arrows loyalty_sfdc.LoyaltyTier --as-source --json
   → finds arrow to sat_customer_demographics.loyalty_tier

2. satsuma arrows sat_customer_demographics.loyalty_tier --as-source --json
   → finds arrow to mart_customer_360.loyalty_tier, classification: "nl"

3. satsuma nl mart_customer_360.loyalty_tier
   → agent reads NL content, notices "points balance" dependency

4. satsuma arrows loyalty_sfdc.LoyaltyPoints --as-source --json
   → agent chases the implicit dependency it discovered
```

The agent builds the chain, interprets NL hops, and discovers implicit dependencies the CLI's structural trace wouldn't catch.

### Coverage assessment

```
1. satsuma fields mart_customer_360 --unmapped-by 'demographics to mart' --json
   → fields not covered by this mapping

2. satsuma fields mart_customer_360 --unmapped-by 'online to mart' --json
   → fields not covered by that mapping

3. Agent intersects the results: fields unmapped by ALL mappings targeting this schema

4. For mapped fields, agent calls satsuma arrows to check classification
   → decides whether NL-only arrows need review
```

### PII audit

```
1. satsuma find --tag pii --json
   → all fields tagged pii

2. For each: satsuma arrows <field> --as-source --json
   → follow downstream

3. Repeat recursively until no more outbound arrows

4. At each hop: agent checks classification
   → if [nl], reads the NL content to judge whether PII survives the transform
```

### Mapping draft

```
1. satsuma match-fields --source loyalty_sfdc --target sat_customer_demographics --json
   → deterministic name matches

2. satsuma nl schema loyalty_sfdc
   → agent reads source field notes for context

3. satsuma nl schema sat_customer_demographics
   → agent reads target field notes to verify matches make semantic sense

4. Agent writes the mapping, using its own judgment for non-obvious matches
```

### Workspace readiness

```
1. satsuma summary --json → counts
2. satsuma validate --json → errors/warnings
3. satsuma warnings --json → open questions
4. For each target schema: satsuma fields <schema> --unmapped-by <mapping> --json
5. Agent assembles the readiness picture
```

---

## Architecture

All new commands build on the existing `WorkspaceIndex` from Feature 09. Extensions needed:

1. **Arrow extraction.** Extend `src/extract.js` to capture per-arrow records: source path, target path, transform text, pipe step decomposition, and CST node types for classification.

2. **Field-level index.** Add a `fieldArrows` index to `WorkspaceIndex`: `Map<"schema.field", ArrowRecord[]>` built from arrow nodes during index construction.

3. **Transform classifier.** A new `src/classify.js` module: `classifyTransform(pipeChainNode) → 'structural' | 'nl' | 'mixed' | 'none'` based on CST pipe step node types.

4. **NL extractor.** A new `src/nl-extract.js` module that walks a CST subtree and collects all NL nodes (nl_string, multiline_string, note_block, note_tag, warning_comment, question_comment) with their structural position.

5. **Metadata extractor.** A new `src/meta-extract.js` module that extracts structured metadata from `metadata` CST nodes — tags, key-value pairs, enum bodies, notes.

6. **Validation layer.** A new `src/validate.js` module for structural and semantic checks.

7. **Diff engine.** A new `src/diff.js` module that compares two `WorkspaceIndex` instances structurally.

```
satsuma CLI (Node.js)
  └── workspace loader          (Feature 09, unchanged)
  └── CST layer                 (tree-sitter-satsuma, Feature 08)
  └── index builder             (Feature 09, extended with field-level arrows)
  └── classify.js               (new — transform classification from CST node types)
  └── nl-extract.js             (new — NL content extraction with position)
  └── meta-extract.js           (new — metadata extraction)
  └── validate.js               (new — structural + semantic checks)
  └── diff.js                   (new — structural comparison)
  └── command handlers
        summary, schema, metric, mapping, find,
        lineage, where-used, warnings, context        (Feature 09)
        arrows, nl, meta, fields, match-fields,
        validate, diff                                 (Feature 10)
```

---

## Relationship to Feature 09

Feature 10 extends the CLI built in Feature 09. It does not replace or rewrite existing commands. Feature 09 commands are workspace-level extractors (summary, schema, mapping, lineage). Feature 10 adds lower-level primitives (arrows, nl, meta, fields) and structural analysis (validate, diff) that agents compose into workflows.

---

## Non-Goals

- **No composed analysis commands.** The CLI does not have `impact`, `coverage`, `audit`, `scaffold`, or `inventory` commands. These are agent workflows built from primitives. Adding them would overclaim — their correctness depends on NL interpretation that the CLI cannot perform.
- **No NL interpretation.** The CLI does not call language models, interpret NL transform strings, or make semantic judgments. It extracts and classifies.
- **No NL query interface.** Commands take explicit structural arguments. The CLI does not accept natural-language questions.
- Autofix for validation errors (the agent decides how to fix; the CLI only reports).
- Watch mode or incremental validation.
- Formatting or rewriting Satsuma files (`satsuma fmt` is a separate potential feature).
- Import resolution across repositories.

---

## Help Text

Every command's `--help` must state:

1. **What structural operation it performs.**
2. **That NL content is extracted verbatim, not interpreted.**

The top-level `satsuma --help`:

```
Satsuma CLI — deterministic structural analysis for Satsuma workspaces.

Extracts facts from parse trees. Does not interpret natural-language
content — NL transforms, notes, and comments are extracted verbatim
for agent or human interpretation.

WORKSPACE EXTRACTORS (Feature 09)
  summary              Workspace overview
  schema <name>        Full schema definition
  metric <name>        Full metric definition
  mapping <name>       Full mapping with arrows
  find --tag <token>   Fields carrying a metadata tag
  lineage              Schema-level graph traversal
  where-used <name>    All references to a name
  warnings             //! and //? comments
  context <query>      Keyword-ranked block extraction (heuristic)

STRUCTURAL PRIMITIVES (Feature 10)
  arrows <schema.field>  All arrows involving a field, with classification
  nl <scope>             NL content (notes, transforms, comments) in a scope
  meta <scope>           Metadata entries for a block or field
  fields <schema>        Field list with types and metadata
  match-fields           Normalized name comparison between two schemas

STRUCTURAL ANALYSIS (Feature 10)
  validate             Parse errors and semantic reference checks
  diff <a> <b>         Structural comparison of two workspace snapshots
```
