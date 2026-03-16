# STM Design Decisions Log

## Key choices and their rationale

---

This document records the significant design decisions made during the creation of the STM language specification, the alternatives considered, and the reasoning behind each choice. It serves as context for future contributors and as a record of the thinking process.

---

### DD-001: Why a new DSL instead of extending YAML/JSON Schema?

**Decision:** Create a custom syntax rather than extending the existing YAML-based STM-YAML v3 format.

**Alternatives considered:**
1. Continue with YAML + custom keys
2. Use JSON Schema with mapping extensions
3. Use TOML
4. Create a custom DSL

**Reasoning:**

The YAML approach was tried (STM-YAML v3) and found wanting on several dimensions:

- **Verbosity.** A single field mapping requires 3-7 lines of YAML (source, target, transform, description, logic, type keys). In STM, the same mapping is 1-2 lines. Across a 50-field mapping, this is the difference between 150 and 350 lines — and the 150-line version is more readable.
- **Token cost.** YAML's key-value structure repeats key names (`source:`, `target:`, `transform:`) on every mapping entry. This adds ~40-60% overhead in LLM token consumption for no information gain.
- **Visual scanning.** YAML's indentation-sensitivity makes large mapping blocks hard to scan. A columnar layout (field, type, tags aligned) is far more scannable.
- **Schema verbosity.** JSON Schema requires `type: "object"`, `properties:`, and deep nesting just to describe a flat field list. STM's one-line-per-field approach is dramatically more compact.

A custom DSL trades universal tool support (YAML parsers exist everywhere) for readability and efficiency. We believe this is the right trade because: (a) the primary consumers are humans and AI agents, not generic YAML tools, and (b) a purpose-built parser is straightforward to implement.

---

### DD-002: Why DBML-style syntax specifically?

**Decision:** Borrow heavily from DBML's visual patterns: braced blocks, one-line field declarations with inline type and annotations, columnar alignment.

**Reasoning:**

DBML has demonstrated that a concise, visually clean syntax for describing data structures can gain widespread adoption even without major tooling investment. It "went viral" in the database design community because:

1. It reads like documentation without being documentation
2. It can be learned by reading a single example
3. It's small enough that LLMs produce it reliably
4. It balances structure with readability

We want exactly these properties for mapping documents.

DBML's limitation is that it only describes structure (tables, columns, relationships) — not transformations. STM extends the paradigm with `mapping {}` blocks while keeping the schema description style.

---

### DD-003: Implicit vs explicit scoping in mapping blocks

**Decision:** For 1:1 cardinality, bare field names in `mapping {}` resolve implicitly (left = source, right = target). For N:M, you name the pair: `mapping A -> B { ... }`. Explicit qualification (`schema_id.field`) is always available as an override.

**Alternatives considered:**
1. Always require explicit `schema_id.field` paths (like STM-YAML v3)
2. Always implicit (resolve by searching all schemas)
3. Hybrid: implicit default with explicit override

**Reasoning:**

In real-world mapping documents, 70-80% of integrations are 1:1. Requiring `legacy_sqlserver.CUST_ID -> postgres_db.customer_id` on every line when there's only one source and one target is pure noise. The implicit approach for 1:1 is unambiguous and saves ~30% of tokens in the mapping block.

For N:M, ambiguity is real — if `email` exists in three sources, the parser can't know which you mean. Naming the pair (`mapping crm_system -> analytics_db`) establishes the context. The escape hatch (`payment_gateway.status` inside a `crm -> notification` block) handles the cross-reference case without abandoning the implicit default.

**Risk:** Implicit scoping could confuse newcomers who don't realize left/right resolution differs. Mitigation: the linter catches ambiguous references and suggests explicit qualification.

---

### DD-004: `->` vs `=>` for direct and computed mappings

**Decision:** Use `->` for "source field maps to target field" and `=>` for "target field is computed with no single source."

**Alternatives considered:**
1. Single arrow for both, with presence/absence of source determining type
2. Keywords: `direct:` and `computed:` or `calc:`
3. Different arrow styles: `->` and `~>`

**Reasoning:**

The two-operator approach makes intent visually obvious at a glance. When scanning a mapping block, you can immediately distinguish "this target is fed by that source" from "this target is calculated." The `=>` reads as "results in" without implying a specific source.

We avoid keywords (option 2) because they add line length and visual noise. We chose `=>` over `~>` because `=>` is universally recognized from JavaScript, Scala, and other languages.

---

### DD-005: Transform pipes with `|`

**Decision:** Transform chains use `|` (pipe) operator: `trim | lowercase | validate_email`.

**Alternatives considered:**
1. Dot-chaining: `trim.lowercase.validate_email`
2. Function nesting: `validate_email(lowercase(trim(value)))`
3. Arrow chaining: `trim -> lowercase -> validate_email`
4. Semicolons: `trim; lowercase; validate_email`

**Reasoning:**

The pipe operator is universally understood from Unix shell, Elixir, F#, and modern JavaScript proposals. It reads left-to-right (natural reading order), each step is clearly delimited, and it composes visually as a "processing pipeline" — which is exactly what a data transformation is.

Dot-chaining (option 1) looks like method calls and could be confused with path navigation. Function nesting (option 2) reads inside-out, which is cognitively difficult for long chains. Arrow chaining (option 3) conflicts with the mapping `->` operator.

---

### DD-006: `nl()` for natural language transforms

**Decision:** Provide an `nl()` function that contains free-text intent, treated as opaque by parsers and linters, intended for human or AI interpretation.

**Alternatives considered:**
1. All transforms must be parseable expressions
2. Free-text transforms only (no structured transform language)
3. Comments on transform lines to describe intent

**Reasoning:**

This is perhaps the most important design decision in STM. The reality of data integration is that many transformations are too complex, too context-dependent, or too ambiguous to express in a mini-expression language. Examples from real projects:

- "Normalize the phone number to E.164, assuming US country code if ambiguous, but handle UK numbers from the legacy system's international customer records"
- "Filter profanity using the corporate word list, version 3.2, replacing matches with asterisks but preserving the original in the audit log"
- "Extract the supplier code from the composite key by parsing the string before the first '/' and looking it up in the MFCS supplier table"

Forcing these into a parseable expression either makes the expression language explosively complex or forces authors to oversimplify the intent. `nl()` acknowledges that some transforms need human judgment or AI interpretation.

The key insight is that `nl()` is **explicitly marked as non-parseable**. A linter can flag every `nl()` as a W005 warning ("requires implementation"). A code generator can emit a `NotImplementedError` with the intent text. An AI agent can read the intent and generate an implementation. Nothing is silently ambiguous.

`nl()` is also composable with parseable transforms in a pipe chain: `nl("clean the data") | truncate(5000)`. This lets authors be precise where they can and fuzzy where they must.

---

### DD-007: Schema block keyword synonyms

**Decision:** Allow `source`, `target`, `table`, `message`, `record`, `event`, `schema`, `lookup` as interchangeable block keywords (except `lookup` which has special semantics).

**Alternatives considered:**
1. Only `source` and `target` keywords
2. Only `schema` keyword with a `role` attribute
3. Allow any keyword (fully freeform)

**Reasoning:**

STM describes integrations between wildly different system types. A database table, an EDI message, a Kafka event, and a CSV file all have "fields with types" but calling them all `source` feels wrong and loses documentary value. When you read `message edi_desadv`, you immediately know this is a message format, not a database table.

Making the keywords synonyms (structurally identical) means the parser doesn't need special handling. The keyword is metadata for humans, not behavior for machines. The exception is `lookup`, which signals "this is reference data only, never a mapping endpoint" — a useful semantic distinction that linters can enforce.

---

### DD-008: Triple-quoted strings for notes

**Decision:** Use `'''...'''` for multi-line strings (notes, selection criteria).

**Alternatives considered:**
1. YAML-style `|` or `>` block scalars
2. Heredoc syntax (`<<EOF ... EOF`)
3. Backtick strings (`` ` ... ` ``)
4. Double-quoted with `\n`

**Reasoning:**

Triple quotes are well-known from Python and TOML. They allow raw content (no escape processing needed), which is critical for markdown that may contain backticks, quotes, and special characters. Heredoc syntax is familiar but introduces variable delimiters. Backtick strings conflict with our identifier escaping. YAML block scalars require specific indentation rules that add cognitive load.

The triple-single-quote (`'''`) rather than triple-double-quote (`"""`) is deliberate — it avoids confusion with JSON string escaping and is visually distinct from regular double-quoted strings.

---

### DD-009: `@` annotations for physical format hints

**Decision:** Use `@format`, `@xpath`, `@pos`, `@filter`, `@header`, `@ns`, `@path` as annotations on schema elements to describe physical extraction details.

**Alternatives considered:**
1. Inline in the type expression: `DOCNUM CHAR(35, xpath="//Order/DocNum")`
2. Separate extraction spec file
3. Embed in tags: `[xpath: "//Order/DocNum"]`

**Reasoning:**

Physical extraction details (byte offsets, XPath expressions, column headers) are metadata about *how to get the data*, separate from *what the data is*. The `@` prefix creates a clear visual and conceptual distinction from the field declaration itself.

Putting extraction hints in the type expression (option 1) overloads the type system and makes field declarations unreadable for complex XPaths. Separating into a different file (option 2) breaks the "single source of truth" principle. Tags (option 3) would work but mixes validation constraints (`required`, `min`) with extraction mechanics, which are fundamentally different concerns.

The `@` syntax is familiar from Java annotations, Python decorators, and Kotlin — all widely represented in LLM training data.

---

### DD-010: Imports with ES6-style syntax

**Decision:** Use `import "path"` for wildcard imports and `import { name } from "path"` for named imports with optional `as` aliasing.

**Alternatives considered:**
1. C-style `#include "path"`
2. Python-style `from path import name`
3. Go-style `import ("path1" "path2")`

**Reasoning:**

ES6 import syntax is among the most widely used in modern software development and is extremely well-represented in LLM training data. The `import { x, y } from "path"` pattern is immediately readable and unambiguous. The `as` alias for renaming is familiar from both ES6 and Python.

We chose ES6 over Python's `from...import` because ES6 puts the keyword `import` first, which is more scannable when you have many import lines — you see the pattern instantly.

---

### DD-011: `...spread` syntax for fragments

**Decision:** Use `...fragment_id` to inline a fragment's fields into a schema block, borrowing JavaScript's spread operator.

**Reasoning:**

Fragment composition is the reuse mechanism for STM. Address blocks, audit columns, and common field groups shouldn't be copy-pasted across schemas. The spread operator is visually distinctive (three dots stand out), semantically clear (the fragment's fields are "spread" into the block), and familiar from JavaScript/TypeScript.

---

### DD-012: Three-tier comment semantics

**Decision:** `//` for info, `//!` for warnings, `//?` for questions/TODOs.

**Reasoning:**

In mapping documents, not all annotations are equal. A note saying "this field contains the customer ID" is fundamentally different from "this field contains invalid data 30% of the time" or "do we need to encrypt this?" Traditional single-comment-style forces everything to the same severity level, requiring readers to scan every comment to find the important ones.

Three tiers allow:
- **Linters** to report counts of warnings and open questions
- **Renderers** to color-code annotations by severity
- **AI agents** to prioritize warnings when implementing transforms
- **Reviewers** to search for `//?` to find all unresolved questions

The `//!` convention is borrowed from Rust's doc-comments. The `//?` convention is new but self-explanatory.

---

### DD-013: Backtick escaping with doubled-backtick for literal backticks

**Decision:** Use SQL-style backticks for non-standard identifiers, with ```` `` ```` (doubled backtick) to represent a literal backtick in a name.

**Alternatives considered:**
1. Double quotes for quoting (like SQL standard)
2. Square brackets (like SQL Server's `[field name]`)
3. Backslash escaping inside backticks

**Reasoning:**

Double quotes are already used for string literals in STM, so using them for identifier quoting would create ambiguity. Square brackets conflict with tag lists. Backslash escaping inside backticks is uncommon and easy to get wrong.

Doubled-backtick is used by MySQL and BigQuery for this exact purpose. It's predictable (the only special character in backtick strings is the backtick itself) and LLMs handle it correctly because of extensive MySQL training data.

The rule is simple enough to state in one sentence: "A literal backtick inside a backtick-quoted name is written as two consecutive backticks." No other escape sequences exist inside backticks.
