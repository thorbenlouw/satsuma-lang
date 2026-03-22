---
id: sl-egu3
status: open
deps: []
links: []
created: 2026-03-22T07:46:02Z
type: bug
priority: 2
assignee: Thorben Louw
parent: sl-dno6
tags: [cli, nl, exploratory-testing-2]
---
# nl: scope argument does not accept standalone transform block names

The nl command's scope argument only accepts schema, mapping, and metric names. Standalone transform block names are rejected, even though nl (with no scope) correctly extracts NL content from transforms and attributes them with the transform name as parent.

## Reproduction

```stm
transform 'normalize readings' {
  trim | lowercase | "Convert imperial to metric units"
}
```

Run: `satsuma nl 'normalize readings' <file>`

Expected: NL content from the 'normalize readings' transform block.
Actual: "'normalize readings' not found as a schema, mapping, or metric." (exit code 1)

Running without a scope filter correctly shows the NL content with parent="normalize readings".

## Note

The error message itself reveals the gap: it says "schema, mapping, or metric" — transforms are not in the accepted scope list.

