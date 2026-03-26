import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  InitializeResult,
  FileChangeType,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { Tree } from "./parser-utils";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { getParser, initParser } from "./parser-utils";
import { setHighlightsSource } from "./semantic-tokens";
import { computeDiagnostics } from "./diagnostics";
import { computeDocumentSymbols } from "./symbols";
import { computeFoldingRanges } from "./folding";
import { computeSemanticTokens, semanticTokensLegend } from "./semantic-tokens";
import { computeHover } from "./hover";
import { runValidate } from "./validate-diagnostics";
import {
  WorkspaceIndex,
  createWorkspaceIndex,
  indexFile,
  removeFile,
  allBlockNames,
  resolveDefinition,
  findReferences,
} from "./workspace-index";
import { computeDefinition } from "./definition";
import { computeReferences } from "./references";
import { computeCompletions } from "./completion";
import { computeCodeLenses } from "./codelens";
import { prepareRename, computeRename } from "./rename";
import { computeFormatting, initFormatting } from "./formatting";
import { buildVizModel } from "./viz-model";

// ---------- Connection setup ----------

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Per-document parse tree cache
const trees = new Map<string, Tree>();

// Per-document validate diagnostics cache (keyed by URI)
const validateDiagCache = new Map<string, import("vscode-languageserver").Diagnostic[]>();

// Workspace index for cross-file navigation
const wsIndex: WorkspaceIndex = createWorkspaceIndex();

// CLI path resolved at initialization
let cliPath = "satsuma";

// Workspace folders for file scanning
let workspaceFolders: string[] = [];

// ---------- Initialisation ----------

connection.onInitialize(async (params): Promise<InitializeResult> => {
  // Initialise WASM parser — the .wasm and highlights.scm live next to server.js
  const serverDir = __dirname;
  const wasmPath = path.join(serverDir, "tree-sitter-satsuma.wasm");
  const highlightsPath = path.join(serverDir, "highlights.scm");
  await initParser(wasmPath);
  await initFormatting();
  try {
    setHighlightsSource(fs.readFileSync(highlightsPath, "utf-8"));
  } catch {
    // highlights.scm missing — semantic tokens will be unavailable
  }

  // Accept CLI path from client initialization options
  const initOptions = params.initializationOptions;
  if (initOptions?.cliPath && typeof initOptions.cliPath === "string") {
    cliPath = initOptions.cliPath;
  }

  // Capture workspace folders
  if (params.workspaceFolders) {
    workspaceFolders = params.workspaceFolders.map((f) => fileURLToPath(f.uri));
  } else if (params.rootUri) {
    workspaceFolders = [fileURLToPath(params.rootUri)];
  }

  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.Full,
        save: true,
      },
      documentSymbolProvider: true,
      foldingRangeProvider: true,
      semanticTokensProvider: {
        legend: semanticTokensLegend,
        full: true,
      },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      completionProvider: {
        triggerCharacters: ["|", ".", ":", "{"],
        resolveProvider: false,
      },
      codeLensProvider: {
        resolveProvider: false,
      },
      renameProvider: {
        prepareProvider: true,
      },
      documentFormattingProvider: true,
    },
  };
});

// Index workspace files after initialization
connection.onInitialized(() => {
  for (const folder of workspaceFolders) {
    indexWorkspaceFolder(folder);
  }
});

// ---------- Document lifecycle ----------

documents.onDidChangeContent((change) => {
  const tree = parseDocument(change.document);
  trees.set(change.document.uri, tree);

  // Update workspace index for the open document
  indexFile(wsIndex, change.document.uri, tree);

  // Recompute parse diagnostics and merge with cached validate diagnostics
  sendMergedDiagnostics(change.document.uri, tree);
});

documents.onDidClose((event) => {
  trees.delete(event.document.uri);
  validateDiagCache.delete(event.document.uri);
  // Keep the file in the index (it's still on disk) — just clear the tree cache
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

// Run satsuma validate on save
documents.onDidSave(async (event) => {
  // Re-index from the saved content
  const tree = trees.get(event.document.uri);
  if (tree) {
    indexFile(wsIndex, event.document.uri, tree);
  }

  try {
    const diagsByUri = await runValidate(event.document.uri, cliPath);

    // Update cache: clear stale entries for files no longer reporting
    validateDiagCache.delete(event.document.uri);

    for (const [uri, diags] of diagsByUri) {
      validateDiagCache.set(uri, diags);

      // For the currently open document, merge with parse diagnostics
      const openTree = trees.get(uri);
      if (openTree) {
        sendMergedDiagnostics(uri, openTree);
      }
    }

    // If saved file had validate diagnostics before but now has none, refresh
    const savedTree = trees.get(event.document.uri);
    if (savedTree && !diagsByUri.has(event.document.uri)) {
      sendMergedDiagnostics(event.document.uri, savedTree);
    }
  } catch {
    // CLI not available or errored — parse diagnostics still work
  }
});

// Watch for .stm file changes outside the editor
connection.onDidChangeWatchedFiles((params) => {
  const parser = getParser();
  for (const change of params.changes) {
    if (!change.uri.endsWith(".stm")) continue;

    if (change.type === FileChangeType.Deleted) {
      removeFile(wsIndex, change.uri);
    } else {
      // Created or changed — re-index from disk
      // Skip if the file is open in the editor (onDidChangeContent handles it)
      if (trees.has(change.uri)) continue;

      try {
        const fsPath = fileURLToPath(change.uri);
        const content = fs.readFileSync(fsPath, "utf-8");
        const tree = parser.parse(content);
        if (tree) indexFile(wsIndex, change.uri, tree);
      } catch {
        // File unreadable — skip
      }
    }
  }
});

// ---------- Feature handlers ----------

connection.onDocumentSymbol((params) => {
  const tree = trees.get(params.textDocument.uri);
  if (!tree) return [];
  return computeDocumentSymbols(tree);
});

connection.onFoldingRanges((params) => {
  const tree = trees.get(params.textDocument.uri);
  if (!tree) return [];
  return computeFoldingRanges(tree);
});

connection.onRequest("textDocument/semanticTokens/full", (params) => {
  const tree = trees.get(params.textDocument.uri);
  if (!tree) return { data: [] };
  return computeSemanticTokens(tree);
});

connection.onHover((params) => {
  const tree = trees.get(params.textDocument.uri);
  if (!tree) return null;
  return computeHover(tree, params.position.line, params.position.character);
});

connection.onDefinition((params) => {
  const tree = trees.get(params.textDocument.uri);
  if (!tree) return null;
  return computeDefinition(
    tree,
    params.position.line,
    params.position.character,
    params.textDocument.uri,
    wsIndex,
  );
});

connection.onReferences((params) => {
  const tree = trees.get(params.textDocument.uri);
  if (!tree) return [];
  return computeReferences(
    tree,
    params.position.line,
    params.position.character,
    params.textDocument.uri,
    wsIndex,
    params.context.includeDeclaration,
  );
});

connection.onCompletion((params) => {
  const tree = trees.get(params.textDocument.uri);
  if (!tree) return [];
  return computeCompletions(
    tree,
    params.position.line,
    params.position.character,
    params.textDocument.uri,
    wsIndex,
  );
});

connection.onPrepareRename((params) => {
  const tree = trees.get(params.textDocument.uri);
  if (!tree) return null;
  return prepareRename(
    tree,
    params.position.line,
    params.position.character,
    params.textDocument.uri,
    wsIndex,
  );
});

connection.onRenameRequest((params) => {
  const tree = trees.get(params.textDocument.uri);
  if (!tree) return null;
  return computeRename(
    tree,
    params.position.line,
    params.position.character,
    params.textDocument.uri,
    wsIndex,
    params.newName,
  );
});

connection.onCodeLens((params) => {
  const tree = trees.get(params.textDocument.uri);
  if (!tree) return [];
  return computeCodeLenses(tree, params.textDocument.uri, wsIndex);
});

connection.onDocumentFormatting((params) => {
  const tree = trees.get(params.textDocument.uri);
  if (!tree) return [];
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  return computeFormatting(tree, doc.getText());
});

// ---------- Custom requests ----------

/** Return all block names from the workspace index (for command QuickPicks). */
connection.onRequest("satsuma/blockNames", () => {
  return allBlockNames(wsIndex).map(({ name, entry }) => ({
    name,
    kind: entry.kind,
    uri: entry.uri,
  }));
});

/** Return the VizModel for a document (for mapping visualization). */
connection.onRequest(
  "satsuma/vizModel",
  (params: { uri: string }) => {
    const tree = trees.get(params.uri);
    if (!tree) return null;
    return buildVizModel(params.uri, tree, wsIndex);
  },
);

/** Return linked file URIs for cross-file lineage expansion in the viz. */
connection.onRequest(
  "satsuma/vizLinkedFiles",
  (params: { schemaId: string; currentUri: string }) => {
    const refs = findReferences(wsIndex, params.schemaId);
    const defs = resolveDefinition(wsIndex, params.schemaId, null);
    const uris = new Set<string>();
    for (const r of refs) {
      if (r.uri !== params.currentUri) uris.add(r.uri);
    }
    for (const d of defs) {
      if (d.uri !== params.currentUri) uris.add(d.uri);
    }
    return [...uris];
  },
);

/** Return field locations for a schema/fragment (for coverage decorations). */
connection.onRequest(
  "satsuma/fieldLocations",
  (params: { name: string }) => {
    const defs = resolveDefinition(wsIndex, params.name, null);
    if (defs.length === 0) return [];
    const def = defs[0]!;
    return def.fields.map((f) => ({
      name: f.name,
      uri: def.uri,
      line: f.range.start.line,
    }));
  },
);

// ---------- Helpers ----------

function parseDocument(doc: TextDocument): Tree {
  const parser = getParser();
  const tree = parser.parse(doc.getText());
  if (!tree) throw new Error("parse returned null");
  return tree;
}

/** Send parse diagnostics merged with cached validate diagnostics. */
function sendMergedDiagnostics(uri: string, tree: Tree): void {
  const parseDiags = computeDiagnostics(tree);
  const validateDiags = validateDiagCache.get(uri) ?? [];
  connection.sendDiagnostics({
    uri,
    diagnostics: [...parseDiags, ...validateDiags],
  });
}

/** Recursively find all .stm files in a directory and index them. */
function indexWorkspaceFolder(folderPath: string): void {
  const parser = getParser();
  const stmFiles = findStmFiles(folderPath);

  for (const filePath of stmFiles) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const tree = parser.parse(content);
      if (!tree) continue;
      const uri = pathToFileURL(filePath).toString();
      indexFile(wsIndex, uri, tree);
    } catch {
      // Unreadable file — skip
    }
  }
}

/** Recursively find .stm files, skipping hidden dirs and node_modules. */
function findStmFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findStmFiles(full));
      } else if (entry.name.endsWith(".stm")) {
        results.push(full);
      }
    }
  } catch {
    // Unreadable directory — skip
  }
  return results;
}

// ---------- Start ----------

documents.listen(connection);
connection.listen();
