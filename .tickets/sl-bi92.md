---
id: sl-bi92
status: closed
deps: []
links: []
created: 2026-03-31T08:23:19Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, parser, exploratory-testing]
---
# parser-edge: comments inside source/target blocks parsed as schema references

Comments inside source {} and target {} blocks are parsed as source_item/target entries (schema name references) instead of being treated as comments. This causes: (1) validate warns about undefined refs with the comment text as the 'schema name' (e.g. undefined source '// this comment is inside the source block'), (2) fmt silently drops these comments when reformatting, causing data loss.

Repro:
  echo 'schema s { id INT }
schema t { id INT }
mapping {
  source {
    // comment inside source block
    s
  }
  target { t }
  id -> id
}' > /tmp/test.stm && npx satsuma validate /tmp/test.stm

Expected: comment is ignored by parser, validate clean, fmt preserves comment
Actual: validate warns 'undefined source "// comment inside source block"', fmt drops the comment

Also affects: comments after source entries (e.g. 's // comment'), comments inside target blocks, comments between source/target keyword and opening brace.

Fixture: /tmp/satsuma-test-parser-edge/06e-comment-inside-source.stm, 06f, 06g, 06b

## Notes

**2026-04-01T21:00:00Z**

Cause: Tree-sitter `extras` (comment nodes) appear as named children in `source_block.namedChildren`. The `sourceRefNameNs` helper in `extract.ts` fell through to `entryText(node)` for any non-`source_ref` node, returning the raw comment text as a schema reference.
Fix: Added a `COMMENT_NODE_TYPES` constant and a guard in `sourceRefNameNs` to return `null` for comment, warning_comment, and question_comment nodes. Added a test in `extract.test.ts`.
