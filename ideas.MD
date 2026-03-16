1. Allow importing a DBML schema as a source or target (external file). We don't want to expand the grammar here -- instead we just allow the @dbml() or similar and parse that and EXTERNAL TOOLING is used to bring in the source or target and create the STM-equivalent AST constructs at a higher level. The aim here is to inter-operate with DBML rather than forcing people to rewrite it for  STM, but at the same time we do want STM-native constructs for the kinds of sources and targets
   that DBML doesn't currently target
2. STM syntax highlighter for VSCode
3. Language server to allow really efficient AI traversal of STM things (later)
4. STM linter (CLI)
5. Demonstrate using STM to trace lineage
6. Reason loosely about type changes as transforms... flesh this out
7. Incremental tutorial for BAs that starts simple and expands example-by-example to cover syntax and purpose
8. Change top-level map construct to mapping to disambiguate from map transform
