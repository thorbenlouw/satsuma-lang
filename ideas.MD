1. Allow importing a DBML schema as a source or target (external file). Use metadata tokens like `(from dbml "path")` and have EXTERNAL TOOLING resolve and inline the fields as Satsuma-equivalent AST constructs. The aim is to inter-operate with DBML rather than forcing people to rewrite it for Satsuma, but at the same time we do want Satsuma-native constructs for the kinds of sources and targets that DBML doesn't currently target.
2. [x] Satsuma syntax highlighter for VSCode
3. Language server to allow really efficient AI traversal of Satsuma things (later)
4. Satsuma linter (CLI)
5. Demonstrate using Satsuma to trace lineage
6. Reason loosely about type changes as transforms... flesh this out
7. [x] Incremental tutorial for BAs that starts simple and expands example-by-example to cover syntax and purpose
8. [x] Change top-level map construct to mapping to disambiguate from map transform
9. jsonPath like xmlPath for field references — use `(jsonpath "...")` metadata tokens parallel to existing `(xpath "...")`
10. Extensions for dimensional modelling (facts, dimensions, measures, hierarchies) — use vocabulary tokens in `( )` metadata (e.g. `dimension`, `fact`, `measure`, `grain`) rather than new grammar
11. Extensions for higher-level data vault modelling concepts (hubs, links, satellites) — same approach, use metadata tokens (`hub`, `satellite`, `link`) with the rest inferred. Effectivity dates, historisation fields, key patterns all inferred from vocabulary tokens.
12. [x] Named transforms for reuse (v2 has `transform` blocks with `...spread` syntax). Parameters still to be explored.
13. Minimal concept (like a schema) for metric — use `( )` metadata tokens like `slice`, `source`, `grain`
14. `report` and `model` as either new keywords or schemas with metadata tokens — mostly NL descriptions in `note { }` blocks
15. SCD/historisation patterns — declare with metadata tokens like `scd type 2`, `track {fields}`, `natural_key`
16. Merge/upsert strategy — use `( )` metadata on mapping blocks like `(merge upsert, match_on field, on_match update, on_no_match insert)`
17. Flexible governance via vocabulary tokens in `( )` metadata — `owner`, `steward`, `retention`, `classification`, `mask`, `compliance` etc. No need to bake governance concepts into the core grammar; build a standard token library and let users define their own.
