# Feature 18: TypeScript Migration — TODO

## Step 0: Infrastructure

- [ ] **0.1** Add `tsconfig.json` to `tooling/satsuma-cli/`
  - `module`/`moduleResolution`: `node16`
  - `target`: `es2022`, `outDir`: `dist`, `rootDir`: `src`
  - `strict: true`, `noImplicitAny: false`
  - `allowJs: true`, `declaration: true`, `sourceMap: true`
- [ ] **0.2** Update `package.json`
  - Add devDeps: `typescript ^5.8`, `@types/node ^22`
  - Change bin to `./dist/index.js`
  - Add scripts: `build`, `pretest`, `prepare`, `dev`
  - Add `"imports": { "#src/*": "./dist/*" }` for test imports
- [ ] **0.3** Add `dist/` to `.gitignore`
- [ ] **0.4** Update all test files to import from `#src/` instead of `../src/`
  - Files to update: arrow-extract, classify, context, diff, errors, extract, find, graph, lineage, lint-engine, mapping, metric, namespace-bugs, namespace-index, nl-ref-extract, nl-ref-validate, normalize, schema, summary, validate-bugs, warnings, where-used
  - Also update `test/integration.test.js` if it imports from `../src/`
- [ ] **0.5** Verify: `npx tsc` compiles, `npm test` passes, CLI works e2e

## Step 1: Type foundations + leaf modules

- [ ] **1.1** Create `src/types.ts` with core interfaces
  - `SyntaxNode`, `Tree`, `Parser` — structural types for tree-sitter v0.25
  - `SchemaRecord`, `MetricRecord`, `MappingRecord`, `FragmentRecord`, `ArrowRecord`
  - `WorkspaceIndex`, `ParsedFile`
  - `LintDiagnostic`, `LintFix`, `LintRule`
  - `RegisterFn` (command registration)
- [ ] **1.2** Convert leaf modules (no internal imports)
  - `classify.js` → `classify.ts`
  - `normalize.js` → `normalize.ts`
  - `errors.js` → `errors.ts`
  - `diff.js` → `diff.ts`
- [ ] **1.3** Verify: `tsc` passes, all tests pass

## Step 2: Standalone extractors

- [ ] **2.1** Convert extractor modules
  - `nl-extract.js` → `nl-extract.ts`
  - `meta-extract.js` → `meta-extract.ts`
  - `cst-query.js` → `cst-query.ts`
  - `nl-ref-extract.js` → `nl-ref-extract.ts`
  - `spread-expand.js` → `spread-expand.ts`
- [ ] **2.2** Verify: `tsc` passes, all tests pass

## Step 3: Core pipeline

- [ ] **3.1** Convert `extract.js` → `extract.ts` (~484 lines, highest ROI)
- [ ] **3.2** Convert `index-builder.js` → `index-builder.ts`
- [ ] **3.3** Convert `workspace.js` → `workspace.ts`
- [ ] **3.4** Convert `parser.js` → `parser.ts` (CJS interop via `createRequire`)
- [ ] **3.5** Verify: `tsc` passes, all tests pass

## Step 4: Validation and analysis

- [ ] **4.1** Convert `validate.js` → `validate.ts`
- [ ] **4.2** Convert `lint-engine.js` → `lint-engine.ts`
- [ ] **4.3** Convert `graph-builder.js` → `graph-builder.ts`
- [ ] **4.4** Verify: `tsc` passes, all tests pass

## Step 5: Commands + entry point

- [ ] **5.1** Convert all 19 command files in `src/commands/` → `.ts`
  - arrows, context, diff, fields, find, graph, lineage, lint, mapping, match-fields, meta, metric, nl-refs, nl, schema, summary, validate, warnings, where-used
- [ ] **5.2** Convert `src/index.js` → `src/index.ts`
- [ ] **5.3** Remove `allowJs: true` from tsconfig
- [ ] **5.4** Verify: `tsc` passes, all tests pass, CLI works e2e

## Step 6: Hardening

- [ ] **6.1** Enable `noImplicitAny: true`, fix all resulting errors
- [ ] **6.2** Enable `noUncheckedIndexedAccess: true`, fix all resulting errors
- [ ] **6.3** Final verification: `tsc --strict` passes, all tests pass, full e2e
