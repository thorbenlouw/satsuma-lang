import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  InitializeResult,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { Tree } from "tree-sitter";
import { getParser } from "./parser-utils";
import { computeDiagnostics } from "./diagnostics";
import { computeDocumentSymbols } from "./symbols";
import { computeFoldingRanges } from "./folding";
import { computeSemanticTokens, semanticTokensLegend } from "./semantic-tokens";
import { computeHover } from "./hover";
import { runValidate } from "./validate-diagnostics";

// ---------- Connection setup ----------

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Per-document parse tree cache
const trees = new Map<string, Tree>();

// Per-document validate diagnostics cache (keyed by URI)
const validateDiagCache = new Map<string, import("vscode-languageserver").Diagnostic[]>();

// CLI path resolved at initialization
let cliPath = "satsuma";

// ---------- Initialisation ----------

connection.onInitialize((params): InitializeResult => {
  // Accept CLI path from client initialization options
  const initOptions = params.initializationOptions;
  if (initOptions?.cliPath && typeof initOptions.cliPath === "string") {
    cliPath = initOptions.cliPath;
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
    },
  };
});

// ---------- Document lifecycle ----------

documents.onDidChangeContent((change) => {
  const tree = parseDocument(change.document);
  trees.set(change.document.uri, tree);

  // Recompute parse diagnostics and merge with cached validate diagnostics
  sendMergedDiagnostics(change.document.uri, tree);
});

documents.onDidClose((event) => {
  trees.delete(event.document.uri);
  validateDiagCache.delete(event.document.uri);
  // Clear diagnostics for closed documents
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

// Run satsuma validate on save
documents.onDidSave(async (event) => {
  try {
    const diagsByUri = await runValidate(event.document.uri, cliPath);

    // Update cache: clear stale entries for files no longer reporting
    // Only clear for the saved file — other files keep their cached diagnostics
    validateDiagCache.delete(event.document.uri);

    for (const [uri, diags] of diagsByUri) {
      validateDiagCache.set(uri, diags);

      // For the currently open document, merge with parse diagnostics
      const tree = trees.get(uri);
      if (tree) {
        sendMergedDiagnostics(uri, tree);
      }
    }

    // If saved file had validate diagnostics before but now has none, refresh
    const tree = trees.get(event.document.uri);
    if (tree && !diagsByUri.has(event.document.uri)) {
      sendMergedDiagnostics(event.document.uri, tree);
    }
  } catch {
    // CLI not available or errored — parse diagnostics still work
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

// ---------- Helpers ----------

function parseDocument(doc: TextDocument): Tree {
  const parser = getParser();
  return parser.parse(doc.getText());
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

// ---------- Start ----------

documents.listen(connection);
connection.listen();
