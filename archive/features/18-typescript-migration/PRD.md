# Feature 18: TypeScript Migration for Satsuma CLI

## Problem

The Satsuma CLI (`tooling/satsuma-cli/`) is ~2,790 lines of plain JavaScript across 35 source files. Complex data shapes (WorkspaceIndex, extraction records, tree-sitter CST nodes) flow through multiple layers with no compile-time safety beyond scattered JSDoc annotations. This creates risk during refactoring, makes it harder to onboard contributors, and leaves shape mismatches to be caught only by tests or at runtime.

## Goal

Incrementally migrate the CLI from JavaScript to TypeScript, gaining compile-time type safety while keeping the CLI functional at every step. All 224 tests must pass throughout the migration.

## Success Criteria

- All `src/*.js` files converted to `.ts`
- `tsc --strict` passes with no errors
- All existing tests pass against compiled output
- CLI works end-to-end (`satsuma summary`, `satsuma schema`, etc.)
- No runtime TypeScript dependency (compiled to JS via `tsc`)
- Single-binary distribution story unchanged (still requires Node.js)

## Non-Goals

- Converting test files to TypeScript (deferred — tests stay as `.js`)
- Adding a bundler (esbuild, rollup, etc.)
- Using runtime TS loaders (tsx, ts-node, `--experimental-strip-types`)
- Changing the CLI's architecture or public API

## Strategy

**Compile with `tsc` to `dist/`, keep tests as `.js`.**

- Source: `src/*.ts` (and `src/*.js` during migration via `allowJs`)
- Output: `dist/` (compiled JS + declarations + source maps)
- Bin entry point: `./dist/index.js`
- Tests: remain `.js`, import from `dist/` via package.json subpath imports (`#src/*`)

**Import paths need no changes.** All imports already use `.js` extensions. TypeScript with `"module": "node16"` resolves `./classify.js` to `./classify.ts` at compile time and emits `./classify.js` in output.

## Implementation Steps

### Step 0: Infrastructure

1. Add `tsconfig.json`:
   - `module`/`moduleResolution`: `"node16"`
   - `target`: `"es2022"`, `outDir`: `"dist"`, `rootDir`: `"src"`
   - `strict: true`, `noImplicitAny: false` (deferred until tree-sitter types stabilize)
   - `allowJs: true` for coexistence
   - `declaration: true`, `sourceMap: true`

2. Update `package.json`:
   - Add devDeps: `typescript ^5.8`, `@types/node ^22`
   - Change bin to `"satsuma": "./dist/index.js"`
   - Add scripts: `"build": "tsc"`, `"pretest": "tsc"`, `"prepare": "tsc"`, `"dev": "tsc --watch"`
   - Add `"imports": { "#src/*": "./dist/*" }` for test imports

3. Add `dist/` to `.gitignore`

4. Update all test files to import from `#src/` instead of `../src/`

5. **Verify**: `npx tsc` compiles all `.js` into `dist/`, `npm test` passes, `node dist/index.js summary ../../examples` works end-to-end.

### Step 1: Type foundations + leaf modules

1. Create `src/types.ts` with core interfaces:
   - `SyntaxNode`, `Tree`, `Parser` — structural types matching tree-sitter v0.25 usage patterns
   - `SchemaRecord`, `MetricRecord`, `MappingRecord`, `FragmentRecord`, `ArrowRecord` — domain entity types
   - `WorkspaceIndex`, `ParsedFile` — pipeline data structures
   - `LintDiagnostic`, `LintFix`, `LintRule` — lint framework types
   - `RegisterFn` — command registration signature

2. Convert leaf modules (no internal imports):
   - `classify.js` → `classify.ts`
   - `normalize.js` → `normalize.ts`
   - `errors.js` → `errors.ts`
   - `diff.js` → `diff.ts`

3. **Verify**: `tsc` passes, all tests pass.

### Step 2: Standalone extractors

Convert modules imported by many but importing nothing internal:
- `nl-extract.js` → `nl-extract.ts`
- `meta-extract.js` → `meta-extract.ts`
- `cst-query.js` → `cst-query.ts`
- `nl-ref-extract.js` → `nl-ref-extract.ts`

These benefit immediately from `SyntaxNode` parameter types.

### Step 3: Core pipeline

- `extract.js` → `extract.ts` (largest file, ~484 lines, highest ROI for type safety)
- `index-builder.js` → `index-builder.ts` (constructs WorkspaceIndex — the central data structure)
- `workspace.js` → `workspace.ts` (file discovery, async I/O)
- `parser.js` → `parser.ts` (CJS interop via `createRequire` — cast to custom `Parser` interface)

### Step 4: Validation and analysis

- `validate.js` → `validate.ts`
- `lint-engine.js` → `lint-engine.ts`
- `graph-builder.js` → `graph-builder.ts`

### Step 5: Commands + entry point

- Convert all 19 command files in `src/commands/` (uniform pattern: `export function register(program: Command)`)
- Convert `src/index.js` → `src/index.ts`
- Remove `allowJs: true` from tsconfig

### Step 6: Hardening (post-migration)

- Enable `noImplicitAny: true`, fix remaining `any` types
- Enable `noUncheckedIndexedAccess: true`
- Update CI workflow if an explicit build step is clearer than relying on `pretest`

## Key Design Decisions

### Why `tsc` over alternatives

| Option | Rejected because |
|--------|-----------------|
| tsx/ts-node at runtime | Adds startup latency to a CLI invoked frequently by agents |
| Node `--experimental-strip-types` | No `enum`/`namespace` support, no declaration output, ties min Node version to 22+ |
| esbuild/swc | Overkill — no bundling needed for a CLI tool |

### Why tests stay as `.js`

- Node's built-in test runner works natively with `.js`
- Tests validate compiled output (the actual artifact), not source
- Mock CST helpers are intentionally minimal — typing them adds little value
- Can be converted in a future phase if desired

### CJS interop for tree-sitter

The `createRequire` pattern in `parser.js` works identically in TypeScript. There are no `@types/tree-sitter` for v0.25, so we define minimal structural interfaces (`SyntaxNode`, `Tree`, `Parser`) matching the subset the codebase actually uses. The mock CST nodes in tests already conform to this shape.

```typescript
const require = createRequire(import.meta.url);
const ParserCtor = require("tree-sitter") as new () => Parser;
const STM = require("tree-sitter-satsuma") as unknown;
```

### tsconfig.json

```jsonc
{
  "compilerOptions": {
    "module": "node16",
    "moduleResolution": "node16",
    "target": "es2022",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "allowJs": true,       // removed after full migration
    "checkJs": false,
    "strict": true,
    "noImplicitAny": false, // enabled in Step 6
    "esModuleInterop": true,
    "forceConsistentCasingInImports": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

## Dependency Graph (migration order rationale)

```
Leaves (no internal imports):
  classify, normalize, errors, diff

Layer 1 (imports only leaves):
  extract → classify

Layer 2 (no internal imports, but widely imported):
  nl-extract, meta-extract, cst-query, nl-ref-extract

Layer 3 (core pipeline):
  index-builder → extract, nl-ref-extract
  workspace → extract
  parser (CJS interop, no internal imports)

Layer 4 (analysis):
  validate → nl-ref-extract, index-builder
  lint-engine → nl-ref-extract
  graph-builder → nl-ref-extract

Layer 5 (commands — all follow same pattern):
  commands/*.js → workspace, parser, index-builder, etc.

Layer 6 (entry point):
  index.js → commands/* (dynamic import)
```

## Verification (after each step)

1. `npx tsc --noEmit` — type-check passes
2. `npm run build` — `dist/` generated successfully
3. `npm test` — all 224 tests pass
4. `node dist/index.js summary ../../examples` — CLI works end-to-end

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| `node-gyp` native binding breaks with new build setup | tree-sitter-satsuma is a runtime `file:` dep, not compiled by `tsc` — unaffected |
| Test import path changes break tests | Step 0 validates all tests before any `.ts` conversion begins |
| `allowJs` masks type errors in unconverted files | Expected — unconverted files are checked only after conversion |
| Dynamic command import in `index.ts` | Cast to `{ register: RegisterFn }` — commands in `dist/` are plain `.js` |

## Rollback

At any point, renaming a `.ts` file back to `.js` is safe because `allowJs: true` ensures `tsc` handles both. The `dist/` output is identical either way.
