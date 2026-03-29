# ADR-007 — Formatter in satsuma-core

**Status:** Accepted
**Date:** 2025 (retrospective, Feature 20)

## Context

`satsuma fmt` is the opinionated formatter for Satsuma files (Feature 20). The formatter takes a parsed tree and source string and returns formatted source. It was implemented as a single pure function:

```typescript
format(tree: Tree, source: string): string
```

The formatter was needed by:
- The CLI (`satsuma fmt` command, `satsuma fmt --check`)
- The LSP server (document formatting via `textDocument/formatting` request)

Both needed the same logic and there was no ambiguity about where it should live.

## Decision

The formatter (`format.ts`, ~1200 lines) lives in `satsuma-core` and is its first significant shared module.

This established the pattern for `satsuma-core`: a home for pure, tree-backed transformations that both CLI and LSP need. Feature 26 (ADR-003) extends this pattern to extraction.

## Consequences

**Positive:**
- Format logic is tested once (via `satsuma-core` tests and CLI's `format.test.js` which exercises the CLI command end-to-end)
- The LSP's document formatting handler is a trivial one-liner: `return format(tree, source)`
- `satsuma-core` was established as the right home for shared tree-backed logic before extraction consolidation

**Negative:**
- `format.ts` is large (~1200 lines) and is in the same package as the much smaller utility modules. Future maintainers must know to look in `satsuma-core` for the formatter, not `satsuma-cli`
