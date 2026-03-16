---
id: stm-2m6y
status: closed
deps: [stm-o50b]
links: []
created: 2026-03-16T13:46:39Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-t1n8
---
# Scaffold the VS Code STM extension package

Create the initial tooling/vscode-stm extension package with language registration, language configuration, manifest wiring, test harness setup, and basic development documentation so the extension is installable and testable before full grammar coverage lands.

## Design Notes

Reference: [HIGHLIGHTING-TAXONOMY.md §5, §6](features/03-vscode-syntax-highlighter/HIGHLIGHTING-TAXONOMY.md)

### Grammar authoring format

Author the TextMate grammar directly in JSON at `syntaxes/stm.tmLanguage.json`. YAML adds a build step without enough benefit for a grammar of this size (taxonomy §6).

### Test harness

Use [`vscode-tmgrammar-test`](https://github.com/nicolo-ribaudo/vscode-tmgrammar-test) for non-interactive TextMate scope assertions (taxonomy §5.1). Install as a devDependency. Rejected alternative: `vscode-tmgrammar-snap` (snapshot-only, weaker failure messages).

### Test execution commands

```bash
# From tooling/vscode-stm/
npx vscode-tmgrammar-test -s syntaxes/stm.tmLanguage.json -g test/fixtures/*.stm
npx vscode-tmgrammar-test -s syntaxes/stm.tmLanguage.json -g test/golden/*.stm
```

Both commands must be non-interactive and exit non-zero on failure.

### Directory structure (taxonomy §5.2)

```
tooling/vscode-stm/
├── package.json
├── language-configuration.json
├── README.md
├── syntaxes/
│   └── stm.tmLanguage.json
└── test/
    ├── fixtures/          # focused valid-syntax snippets with scope assertions
    ├── degradation/       # malformed/editing-state snippets
    └── golden/            # symlinks or copies of examples/*.stm
```

### Language configuration

- Line comments: `//`
- Bracket pairs: `{}`, `[]`, `()`
- Auto-closing pairs: `"`, `'`, `{`, `[`, `(`
- Surrounding pairs: `"`, `{`, `[`, `(`
- Word pattern: include backtick-quoted identifiers

### Golden fixtures

Symlink or copy these canonical examples into `test/golden/`:
- `common.stm`, `db-to-db.stm`, `edi-to-json.stm`, `sfdc_to_snowflake.stm`, `multi-source-hub.stm`, `protobuf-to-parquet.stm`, `xml-to-parquet.stm`

## Acceptance Criteria

- `tooling/vscode-stm/` exists with `package.json`, `language-configuration.json`, `syntaxes/` directory, and minimal README.
- The extension registers language id `stm` and associates `.stm` files.
- Language configuration covers line comments (`//`), bracket pairs (`{}`, `[]`, `()`), and auto-closing/surrounding pairs appropriate for STM.
- `vscode-tmgrammar-test` is installed as a devDependency and wired into an npm test script.
- Test directory structure (`test/fixtures/`, `test/degradation/`, `test/golden/`) is created.
- Golden fixture files from `examples/` are linked or copied into `test/golden/`.
- The extension can be installed or loaded locally for development.
- Development and test commands are documented and non-interactive.
