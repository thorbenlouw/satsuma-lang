# Lesson 08 — The Satsuma CLI as the Agent's Toolkit

## The CLI Is Not for You — It's for the Agent

The Satsuma CLI (`satsuma`) is designed as a **deterministic extraction layer** that the agent composes into workflows. You rarely run CLI commands directly. Instead, you ask the agent a question, and it decides which CLI commands to run, combines their output, and gives you a human-readable answer.

The key principle: **the CLI gives exact slices; the agent supplies the analysis.**

---

## Why This Design

Loading entire Satsuma files into an agent's context window is wasteful and error-prone. A workspace might have dozens of files with thousands of lines. The CLI solves this by letting the agent request exactly the information it needs:

- "Show me just the `customers` schema" — not the entire file.
- "List all arrows involving `email`" — not every mapping in the workspace.
- "Find all fields tagged `pii`" — not a full-text search.

This keeps the agent's context focused and its answers precise.

---

## The 16 Commands

The CLI has 16 commands organized into four groups:

### Workspace Extractors

These pull out specific named blocks:

| Command | What it returns |
|---|---|
| `summary [path]` | Overview of all schemas, mappings, metrics, and counts |
| `schema <name>` | Full definition of one schema |
| `metric <name>` | Full definition of one metric |
| `mapping <name>` | Full mapping with all arrows |
| `find --tag <token>` | All fields carrying a specific metadata tag |
| `lineage --from/--to <schema>` | Schema-level data flow graph |
| `where-used <name>` | All references to a definition across the workspace |
| `warnings` | All `//!` and `//?` comments |
| `context <query>` | Keyword-ranked block extraction |

### Structural Primitives

These extract specific structural elements:

| Command | What it returns |
|---|---|
| `arrows <schema.field>` | All arrows involving a field, with transform classification |
| `nl <scope>` | All natural-language content (notes, transforms, comments) |
| `meta <scope>` | All metadata entries for a block or field |
| `fields <schema>` | Field list with types and metadata |
| `match-fields --source <s> --target <t>` | Normalized name comparison between schemas |

### Workspace Graph

| Command | What it returns |
|---|---|
| `graph [path]` | Complete semantic graph (nodes, edges, field-level flow) |

The `graph` command exports the full workspace structure as a graph. Flags control the output:
- `--json` — machine-readable JSON
- `--compact` — reduced output for smaller context windows
- `--schema-only` — skip field-level detail
- `--namespace` — include namespace information
- `--no-nl` — exclude natural-language content

### Structural Analysis

| Command | What it returns |
|---|---|
| `validate [path]` | Parse errors and semantic reference checks |
| `lint [path]` | Policy and convention checks |
| `diff <a> <b>` | Structural comparison of two snapshots |

---

## validate vs. lint

These two commands serve different purposes:

**`validate`** checks correctness:
- Parse errors (malformed syntax)
- Unresolved references (a mapping refers to a schema that doesn't exist)
- Missing required blocks

If `validate` reports errors, the file is broken. Fix these first.

**`lint`** checks conventions:
- `hidden-source-in-nl` — a backtick reference in NL that doesn't match a declared field
- `unresolved-nl-ref` — a backtick identifier in NL that can't be resolved
- `duplicate-definition` — two definitions with the same name

Lint warnings are advisory. They might indicate real problems or acceptable patterns.

Lint supports additional flags:
- `--fix` — auto-fix certain issues
- `--select` / `--ignore` — choose which rules to run
- `--json` — machine-readable output
- `--quiet` — suppress non-error output
- `--rules` — list available lint rules

---

## Transform Classification

When the agent runs `satsuma arrows`, each arrow is annotated with its transform classification:

| Classification | Meaning | Agent action |
|---|---|---|
| `[structural]` | Deterministic pipeline | Can be validated mechanically |
| `[nl]` | Natural language | Agent interprets the intent |
| `[mixed]` | Pipeline + NL | Agent interprets NL, validates pipeline |
| `[none]` | Direct mapping, no transform | Passthrough — nothing to interpret |
| `[nl-derived]` | Implicit from backtick ref in NL | Agent traces the lineage dependency |

This classification helps the agent decide how to handle each arrow: structural transforms can be checked for correctness, while NL transforms need interpretation and human review.

---

## Output Formats for Agent Workflows

Most CLI commands support `--json` and `--compact` flags:

- **`--json`** produces structured output the agent can parse programmatically.
- **`--compact`** reduces output size for smaller context windows.

The agent typically uses `--json` when it needs to process results programmatically (e.g., building a lineage graph) and default text output when presenting results to you.

---

## How the Agent Composes CLI Commands

When you ask a question like "What fields are marked as PII in this workspace?", the agent:

1. Runs `satsuma find --tag pii <path>`
2. Receives the list of PII-tagged fields with their locations
3. Formats the result as a readable answer

For more complex questions, the agent chains commands:

**"Trace the impact of changing the `CUST_ID` field":**
1. `satsuma arrows legacy_sqlserver.CUST_ID` — find all arrows that use `CUST_ID`
2. `satsuma lineage --from legacy_sqlserver` — see where data flows downstream
3. `satsuma nl` — check NL transforms that reference `CUST_ID` via backticks

**"Are there any unmapped target fields?":**
1. `satsuma fields <target_schema>` — list all target fields
2. `satsuma arrows` for each field — check which have incoming arrows
3. Report any fields with no source

---

## When to Use CLI Output vs. Raw File Reading

| Situation | Approach |
|---|---|
| You need one schema from a large file | `satsuma schema <name>` |
| You need all PII fields across the workspace | `satsuma find --tag pii` |
| You need to understand data flow | `satsuma lineage --from <schema>` |
| You need to read the full file (small file, first time) | Read the file directly |
| You need to edit the file | Read the file, then edit |
| You need to check for errors after editing | `satsuma validate` then `satsuma lint` |

The CLI is most valuable in large workspaces where reading entire files would overwhelm the context. For small files (under 200 lines), reading the file directly is fine.

---

## Exercise: CLI-Assisted Exploration

Imagine you've inherited a Satsuma workspace with 20 files you've never seen before. Here's how the agent would help you explore it:

1. **Get the big picture:** `satsuma summary .`
   - How many schemas? Mappings? Metrics?
   - What systems are represented?

2. **Find risk areas:** `satsuma warnings .`
   - What data quality issues are flagged (`//!`)?
   - What questions are unresolved (`//?`)?

3. **Understand a specific mapping:** `satsuma mapping 'customer migration'`
   - What are the source and target?
   - How many arrows? What classifications?

4. **Check compliance:** `satsuma find --tag pii .`
   - Which fields are PII?
   - Are they encrypted? (Check `meta` for encryption tags.)

5. **Trace lineage:** `satsuma lineage --from crm_customers .`
   - Where does CRM data flow?
   - What downstream targets are affected by a schema change?

Each step gives you exact, parseable information. The agent combines it into a narrative you can act on.

---

## Key Takeaways

1. The CLI is a deterministic extraction layer for the agent — you ask questions, the agent runs commands.
2. 16 commands cover workspace exploration, structural extraction, graph export, and analysis.
3. `validate` checks correctness (parse errors, broken references). `lint` checks conventions.
4. Transform classification (`[structural]`, `[nl]`, `[mixed]`, `[none]`, `[nl-derived]`) tells the agent how to handle each arrow.
5. `--json` and `--compact` flags make CLI output efficient for agent workflows.
6. The agent composes multiple CLI commands to answer complex questions.

---

**Next:** [Lesson 09 — Human-Agent Workflows for Navigation, Impact, and Review](09-agent-workflows.md) — complete workflows built from CLI primitives.
