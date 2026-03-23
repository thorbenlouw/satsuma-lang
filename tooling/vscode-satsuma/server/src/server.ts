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

// ---------- Connection setup ----------

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Per-document parse tree cache
const trees = new Map<string, Tree>();

// ---------- Initialisation ----------

connection.onInitialize((): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      documentSymbolProvider: true,
      foldingRangeProvider: true,
    },
  };
});

// ---------- Document lifecycle ----------

documents.onDidChangeContent((change) => {
  const tree = parseDocument(change.document);
  trees.set(change.document.uri, tree);

  const diagnostics = computeDiagnostics(tree);
  connection.sendDiagnostics({
    uri: change.document.uri,
    diagnostics,
  });
});

documents.onDidClose((event) => {
  trees.delete(event.document.uri);
  // Clear diagnostics for closed documents
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
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

// ---------- Helpers ----------

function parseDocument(doc: TextDocument): Tree {
  const parser = getParser();
  return parser.parse(doc.getText());
}

// ---------- Start ----------

documents.listen(connection);
connection.listen();
