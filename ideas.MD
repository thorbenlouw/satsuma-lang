1. Allow importing a DBML schema as a source or target (external file). We don't want to expand the grammar here -- instead we just allow the @dbml() or similar and parse that and EXTERNAL TOOLING is used to bring in the source or target and create the STM-equivalent AST constructs at a higher level. The aim here is to inter-operate with DBML rather than forcing people to rewrite it for  STM, but at the same time we do want STM-native constructs for the kinds of sources and targets
   that DBML doesn't currently target
2. [x] STM syntax highlighter for VSCode
3. Language server to allow really efficient AI traversal of STM things (later)
4. STM linter (CLI)
5. Demonstrate using STM to trace lineage
6. Reason loosely about type changes as transforms... flesh this out
7. Incremental tutorial for BAs that starts simple and expands example-by-example to cover syntax and purpose
8. [x] Change top-level map construct to mapping to disambiguate from map transform
9. jsonPath like xmlPath for field references in map bodies and queries
10. Extensions for dimensional modelling (facts, dimensions, measures, hierarchies) -- try to reuse as much of the core syntax as possible but add some specific constructs for dimensional modelling concepts and patterns?
11. Extensions for higher-level data vault modelling concepts (hubs, links, satellites) -- same approach as dimensional modelling try not to reinvent the wheel but add some specific constructs for data vault patterns and best practices. What could it be like to have succinct notations for e.g. this is a link of X and Y with fields and the rest is inferred? Effectivity dates, historisation fields, key patterns etc all inferred from @syntax or something? 
12. Declare transform fragment for reuse (esp with parameters and templating)?
13. Minimal concept (like a target) for metric maybe with @slice or @dimension or something?
14. @report and @mlmodel targets that are mostly nl() descrpitions?
15. the SCD/ historisation tags patterns (declare what type, which fields to track) 
16. Some kind of "merge"/"upsert" logic tag that indicates how to handle existing data in the target when mapping -- this is a common scenario in data pipelines and having a standard way to express it could be useful. Maybe something like `@merge_strategy` with options like `append`, `overwrite`, `upsert` etc.
17. Any way to use current tag / @ sytax flexibly for more data governance patterns (retention, pii, owner, tags, masking, classification etc) without having to bake in specific governance concepts into the core syntax? Maybe we can just have a flexible tagging system and then build out a standard library of tags for common governance needs, but allow users to define their own as well?
