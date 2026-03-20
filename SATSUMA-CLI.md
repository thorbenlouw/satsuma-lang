# Satsuma CLI

The `satsuma` command-line tool is a deterministic structural extraction tool for Satsuma workspaces. It sits on top of the tree-sitter parser and provides structured, query-driven access to schemas, mappings, metrics, lineage, and workspace metadata — without requiring callers to read or parse raw `.stm` files.

**The CLI extracts structural facts. It does not interpret natural language.** Satsuma uses NL strings in transform bodies, notes, and comments to express intent that cannot be captured as deterministic pipelines. The CLI parses the structure around that NL content and delivers it verbatim — the consuming agent or human decides what it means. The CLI is the toolkit. The agent is the runtime.

## Installation

The CLI lives in `tooling/satsuma-cli/`. To install it locally:

```bash
cd tooling/satsuma-cli
npm install
npm link    # makes `satsuma` available globally
```

## Design Principle

Every CLI command produces **100% deterministically correct results from the parse tree**. If a result's correctness depends on interpreting natural language, that operation does not belong in the CLI — it belongs in the agent that calls the CLI.

The CLI's role is to make workspace navigation token-efficient: instead of pulling entire files into an agent's context window, the agent makes precise structural queries and gets back exactly the slice it needs. The agent then composes these primitives into higher-level workflows (impact analysis, coverage assessment, audit) where it applies its own reasoning to the NL content the CLI surfaces.

## Commands

### Workspace Extractors

Block-level extraction — retrieve whole blocks or workspace-level summaries.

| Command | Operation | Example |
|---|---|---|
| `summary [path]` | Workspace overview — all schemas, mappings, metrics, counts | `satsuma summary examples/` |
| `schema <name>` | Full schema definition from parse tree | `satsuma schema hub_customer` |
| `metric <name>` | Full metric definition from parse tree | `satsuma metric monthly_revenue` |
| `mapping <name>` | Full mapping with all arrows and transforms | `satsuma mapping 'sfdc to hub_customer'` |
| `find --tag <token>` | Fields carrying a metadata tag | `satsuma find --tag pii` |
| `lineage --from/--to <schema>` | Schema-level graph traversal | `satsuma lineage --from loyalty_sfdc` |
| `where-used <name>` | All references to a schema, fragment, or transform | `satsuma where-used hub_product` |
| `warnings` | All `//!` and `//? ` comments across the workspace | `satsuma warnings` |
| `context <query>` | Keyword-ranked block extraction (heuristic) | `satsuma context "customer mapping"` |

### Structural Primitives

Fine-grained extraction — slice below block level to get specific arrows, NL content, metadata, or field lists.

| Command | Operation | Example |
|---|---|---|
| `arrows <schema.field>` | All arrows involving a field, with transform classification | `satsuma arrows loyalty_sfdc.LoyaltyTier` |
| `nl <scope>` | NL content (notes, transforms, comments) in a scope | `satsuma nl mapping 'demographics to mart'` |
| `meta <scope>` | Metadata entries for a block or field | `satsuma meta field loyalty_sfdc.Email` |
| `fields <schema>` | Field list with types and metadata | `satsuma fields sat_customer_demographics` |
| `match-fields --source <s> --target <t>` | Normalized name comparison between two schemas | `satsuma match-fields --source loyalty_sfdc --target sat_customer_demographics` |

### Workspace Graph

Full workspace topology export for one-shot reasoning.

| Command | Operation | Example |
|---|---|---|
| `graph [path]` | Complete semantic graph — nodes, edges, and field-level data flow | `satsuma graph examples/ --json` |

Flags: `--json` (full graph), `--compact` (schema-level adjacency list), `--schema-only` (omit field-level edges), `--namespace <ns>` (filter to namespace), `--no-nl` (strip NL text from edges).

### Structural Analysis

Operations that check or compare workspace structure.

| Command | Operation | Example |
|---|---|---|
| `validate [path]` | Parse errors and semantic reference checks | `satsuma validate` |
| `diff <a> <b>` | Structural comparison of two workspace snapshots | `satsuma diff v1/ v2/` |

## Transform Classification

Every arrow the CLI returns carries a classification derived from CST node types:

| Classification | Meaning |
|---|---|
| `structural` | Transform is a deterministic pipeline — fully specified by the syntax |
| `nl` | Transform is a natural-language string — extracted verbatim for agent interpretation |
| `mixed` | Both pipeline steps and NL strings |
| `none` | No transform body (bare `src -> tgt`) |

Derived arrows (no source field) are flagged separately. This classification is a mechanical CST check — no string content is examined.

## Common Flags

| Flag | Purpose |
|---|---|
| `--json` | Structured JSON output — the primary agent interface |
| `--compact` | Minimal output, omitting notes and NL strings |
| `--help` | What the command does and what it does not do |

## Exit Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Not found or no results |
| 2 | Parse error or filesystem error |

## How Agents Use the CLI

The CLI is a set of structural primitives the agent composes into workflows. The agent — not the CLI — performs higher-level analysis like impact tracing, coverage assessment, and audit.

### Impact analysis

```bash
# 1. Get arrows from the source field
satsuma arrows loyalty_sfdc.LoyaltyTier --as-source --json

# 2. Follow the chain — call arrows again on each target
satsuma arrows sat_customer_demographics.loyalty_tier --as-source --json

# 3. When a hop is classified [nl], read the NL content
satsuma nl field mart_customer_360.loyalty_tier

# 4. Agent interprets the NL, discovers implicit dependencies,
#    and calls arrows again to chase them
```

### Coverage assessment

```bash
# 1. Which target fields have no arrows from this mapping?
satsuma fields mart_customer_360 --unmapped-by 'demographics to mart' --json

# 2. Repeat for other mappings targeting the same schema
satsuma fields mart_customer_360 --unmapped-by 'online to mart' --json

# 3. Agent intersects results to find fields unmapped by ALL mappings
# 4. For mapped fields, agent checks arrow classification via satsuma arrows
```

### PII audit

```bash
# 1. Find all PII-tagged fields
satsuma find --tag pii --json

# 2. For each, trace outbound arrows
satsuma arrows loyalty_sfdc.Email --as-source --json

# 3. Recurse downstream
satsuma arrows sat_customer_demographics.email --as-source --json

# 4. At [nl] hops, agent reads the NL to judge whether PII survives
satsuma nl field mart_customer_360.email
```

### Drafting a new mapping

```bash
# 1. Deterministic name matches between source and target
satsuma match-fields --source loyalty_sfdc --target sat_customer_demographics --json

# 2. Agent reads NL notes on both schemas to verify matches
satsuma nl schema loyalty_sfdc
satsuma nl schema sat_customer_demographics

# 3. Agent reads metadata to understand constraints
satsuma meta field sat_customer_demographics.country_code

# 4. Agent writes the mapping, applying its own judgment
```

### Whole-workspace reasoning (single load)

```bash
# 1. Load the full workspace graph in one call
satsuma graph examples/ --json > workspace.json

# 2. Agent has all nodes, edges, and field-level data flow
#    — impact analysis, PII audit, coverage check without round-trips
#    — schema_edges for topology, edges for field-level detail
#    — unresolved_nl section surfaces all NL arrows for interpretation

# 3. For large workspaces, narrow the scope:
satsuma graph examples/ --json --namespace warehouse
satsuma graph examples/ --json --schema-only    # topology only
satsuma graph examples/ --json --no-nl          # smaller payload
```

### Reviewing a change

```bash
# 1. Structural diff
satsuma diff main-branch/ feature-branch/ --json

# 2. For changed fields, check downstream arrows
satsuma arrows changed_schema.changed_field --as-source --json

# 3. Agent reads NL on affected arrows to assess semantic impact
```

## What the CLI Does Not Do

- **Does not interpret NL.** Transform strings, notes, and comments are extracted verbatim. The CLI never assesses whether an NL transform is correct, complete, or semantically equivalent to another.
- **Does not compose analysis workflows.** There are no `impact`, `coverage`, `audit`, `scaffold`, or `inventory` commands. These are agent workflows built from primitives — their correctness depends on NL interpretation that the CLI cannot perform.
- **Does not call language models.** The CLI is deterministic, fast, and reproducible. Same input, same output, every time.
- **Does not accept NL queries.** Commands take explicit structural arguments. The agent decides which commands to call based on the user's question.

## Source

- CLI source: `tooling/satsuma-cli/`
- Tree-sitter grammar: `tooling/tree-sitter-satsuma/`
- Feature 09 (workspace extractors): `features/09-stm-cli-llm-context/`
- Feature 10 (structural primitives): `features/10-stm-cli-enhancements/`
