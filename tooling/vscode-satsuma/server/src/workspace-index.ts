import {
  Range,
} from "vscode-languageserver";
import type { SyntaxNode, Tree } from "./parser-utils";
import { nodeRange, child, children, labelText } from "./parser-utils";

// ---------- Data structures ----------

export interface FieldInfo {
  name: string;
  type: string | null;
  range: Range;
  children: FieldInfo[];
}

export interface DefinitionEntry {
  uri: string;
  range: Range;
  selectionRange: Range;
  kind: "schema" | "fragment" | "transform" | "mapping" | "metric" | "namespace";
  namespace: string | null;
  fields: FieldInfo[];
}

export interface ReferenceEntry {
  uri: string;
  range: Range;
  name: string;
  context: "source" | "target" | "spread" | "import" | "arrow" | "metric_source";
}

export interface ImportEntry {
  names: string[];
  resolvedUri: string | null;
  pathRange: Range;
  pathText: string;
}

export interface WorkspaceIndex {
  /** name → definition entries. Keys are qualified ("ns::name") or bare. */
  definitions: Map<string, DefinitionEntry[]>;
  /** name → reference entries across the workspace. */
  references: Map<string, ReferenceEntry[]>;
  /** file URI → import entries. */
  imports: Map<string, ImportEntry[]>;
  /** Set of indexed file URIs. */
  indexedFiles: Set<string>;
}

// ---------- Index lifecycle ----------

export function createWorkspaceIndex(): WorkspaceIndex {
  return {
    definitions: new Map(),
    references: new Map(),
    imports: new Map(),
    indexedFiles: new Set(),
  };
}

/** Index (or re-index) a single file. Replaces any existing entries for the URI. */
export function indexFile(index: WorkspaceIndex, uri: string, tree: Tree): void {
  // Remove old entries for this file first
  removeFile(index, uri);

  index.indexedFiles.add(uri);

  // Extract from top-level nodes
  const root = tree.rootNode;
  for (const node of root.namedChildren) {
    indexTopLevel(index, uri, node, null);
  }
}

/** Remove all entries for a file URI from the index. */
export function removeFile(index: WorkspaceIndex, uri: string): void {
  index.indexedFiles.delete(uri);
  index.imports.delete(uri);

  // Remove definitions belonging to this URI
  for (const [key, entries] of index.definitions) {
    const remaining = entries.filter((e) => e.uri !== uri);
    if (remaining.length === 0) {
      index.definitions.delete(key);
    } else {
      index.definitions.set(key, remaining);
    }
  }

  // Remove references belonging to this URI
  for (const [key, entries] of index.references) {
    const remaining = entries.filter((e) => e.uri !== uri);
    if (remaining.length === 0) {
      index.references.delete(key);
    } else {
      index.references.set(key, remaining);
    }
  }
}

// ---------- Queries ----------

/** Resolve a name to its definitions, considering namespace context. */
export function resolveDefinition(
  index: WorkspaceIndex,
  name: string,
  currentNamespace: string | null,
): DefinitionEntry[] {
  // 1. If the name is already qualified (contains ::), look up directly
  if (name.includes("::")) {
    return index.definitions.get(name) ?? [];
  }

  // 2. Try namespace-qualified first
  if (currentNamespace) {
    const qualified = `${currentNamespace}::${name}`;
    const scoped = index.definitions.get(qualified);
    if (scoped && scoped.length > 0) return scoped;
  }

  // 3. Fall back to global
  return index.definitions.get(name) ?? [];
}

/** Find all references to a name. */
export function findReferences(
  index: WorkspaceIndex,
  name: string,
): ReferenceEntry[] {
  const results: ReferenceEntry[] = [];

  // Direct match
  const direct = index.references.get(name);
  if (direct) results.push(...direct);

  // If the name is qualified (ns::foo), also check for bare references
  // that could resolve to this qualified name
  if (name.includes("::")) {
    const bare = name.split("::").pop()!;
    const bareRefs = index.references.get(bare);
    if (bareRefs) {
      // Only include bare refs that are in files where the namespace context matches
      // For simplicity, include all bare refs — the caller can filter by context
      results.push(...bareRefs);
    }
  }

  // If the name is bare, also check for qualified forms
  if (!name.includes("::")) {
    for (const [key, entries] of index.references) {
      if (key.endsWith(`::${name}`) && key !== name) {
        results.push(...entries);
      }
    }
  }

  return results;
}

/** Get all block names, optionally filtered by kind. */
export function allBlockNames(
  index: WorkspaceIndex,
  kind?: DefinitionEntry["kind"],
): Array<{ name: string; entry: DefinitionEntry }> {
  const results: Array<{ name: string; entry: DefinitionEntry }> = [];
  for (const [name, entries] of index.definitions) {
    for (const entry of entries) {
      if (!kind || entry.kind === kind) {
        results.push({ name, entry });
      }
    }
  }
  return results;
}

/** Get fields for a schema or fragment by name, considering namespace. */
export function getFields(
  index: WorkspaceIndex,
  name: string,
  currentNamespace: string | null,
): FieldInfo[] {
  const defs = resolveDefinition(index, name, currentNamespace);
  for (const def of defs) {
    if (def.fields.length > 0) return def.fields;
  }
  return [];
}

/** Count unique references to a name, optionally filtered by context. */
export function countReferences(
  index: WorkspaceIndex,
  name: string,
  contextFilter?: ReferenceEntry["context"][],
): number {
  const refs = index.references.get(name) ?? [];
  if (!contextFilter) return refs.length;
  return refs.filter((r) => contextFilter.includes(r.context)).length;
}

/** Find distinct mapping names that reference a given schema as source or target. */
export function findMappingsUsing(
  index: WorkspaceIndex,
  schemaName: string,
): string[] {
  const refs = findReferences(index, schemaName);
  const mappingRefs = refs.filter(
    (r) => r.context === "source" || r.context === "target",
  );
  // Deduplicate by URI + parent mapping (approximate: use URI since each mapping body is in one file)
  const seen = new Set<string>();
  for (const ref of mappingRefs) {
    seen.add(`${ref.uri}:${ref.range.start.line}`);
  }
  return [...seen];
}

// ---------- Extraction (per file) ----------

const BLOCK_KINDS: Record<string, DefinitionEntry["kind"]> = {
  schema_block: "schema",
  fragment_block: "fragment",
  transform_block: "transform",
  mapping_block: "mapping",
  metric_block: "metric",
  namespace_block: "namespace",
};

function indexTopLevel(
  index: WorkspaceIndex,
  uri: string,
  node: SyntaxNode,
  namespace: string | null,
): void {
  const kind = BLOCK_KINDS[node.type];

  if (node.type === "namespace_block") {
    const nsName = node.childForFieldName("name")?.text ?? null;
    if (nsName) {
      // Register the namespace itself as a definition
      addDefinition(index, nsName, {
        uri,
        range: nodeRange(node),
        selectionRange: nodeRange(node.childForFieldName("name")!),
        kind: "namespace",
        namespace: null,
        fields: [],
      });

      // Index children within the namespace
      for (const ch of node.namedChildren) {
        if (BLOCK_KINDS[ch.type]) {
          indexTopLevel(index, uri, ch, nsName);
        }
      }
    }
    return;
  }

  if (node.type === "import_decl") {
    indexImport(index, uri, node);
    return;
  }

  if (!kind) return;

  const name = labelText(node);
  if (!name) return;

  const qualifiedName = namespace ? `${namespace}::${name}` : name;
  const lblNode = child(node, "block_label");
  const selectionRange = lblNode ? nodeRange(lblNode) : nodeRange(node);

  // Extract fields for schema/fragment blocks
  const fields = (kind === "schema" || kind === "fragment")
    ? extractFields(child(node, "schema_body"))
    : [];

  addDefinition(index, qualifiedName, {
    uri,
    range: nodeRange(node),
    selectionRange,
    kind,
    namespace,
    fields,
  });

  // Extract references from mapping bodies
  if (kind === "mapping") {
    indexMappingRefs(index, uri, node, namespace);
  }

  // Extract metric source references
  if (kind === "metric") {
    indexMetricRefs(index, uri, node, namespace);
  }

  // Extract fragment spread references from schema/fragment bodies
  if (kind === "schema" || kind === "fragment") {
    const body = child(node, "schema_body");
    if (body) {
      indexSpreadRefs(index, uri, body);
    }
  }
}

function indexImport(index: WorkspaceIndex, uri: string, node: SyntaxNode): void {
  const importNames = children(node, "import_name");
  const importPath = child(node, "import_path");

  const names: string[] = [];
  for (const nameNode of importNames) {
    const qn = child(nameNode, "qualified_name");
    if (qn) {
      const parts = qn.namedChildren.filter((c) => c.type === "identifier");
      if (parts.length >= 2 && parts[0] && parts[1]) {
        names.push(`${parts[0].text}::${parts[1].text}`);
      }
    } else {
      const inner = nameNode.namedChildren[0];
      if (inner?.type === "quoted_name") {
        names.push(inner.text.slice(1, -1));
      } else if (inner) {
        names.push(inner.text);
      }
    }
  }

  // Extract the path text
  let pathText = "";
  if (importPath) {
    const inner = importPath.namedChildren[0];
    if (inner?.type === "nl_string") {
      pathText = inner.text.slice(1, -1);
    } else if (inner) {
      pathText = inner.text;
    } else {
      // import_path is an alias for nl_string, so the node itself might be nl_string
      pathText = importPath.text;
      if (pathText.startsWith('"') && pathText.endsWith('"')) {
        pathText = pathText.slice(1, -1);
      }
    }
  }

  const entry: ImportEntry = {
    names,
    resolvedUri: null, // Caller resolves paths
    pathRange: importPath ? nodeRange(importPath) : nodeRange(node),
    pathText,
  };

  const existing = index.imports.get(uri) ?? [];
  existing.push(entry);
  index.imports.set(uri, existing);

  // Register each imported name as a reference
  for (const nameNode of importNames) {
    const text = importNameText(nameNode);
    if (text) {
      addReference(index, text, {
        uri,
        range: nodeRange(nameNode),
        name: text,
        context: "import",
      });
    }
  }
}

function indexMappingRefs(
  index: WorkspaceIndex,
  uri: string,
  mappingNode: SyntaxNode,
  _namespace: string | null,
): void {
  const body = child(mappingNode, "mapping_body");
  if (!body) return;

  for (const ch of body.namedChildren) {
    if (ch.type === "source_block") {
      for (const ref of children(ch, "source_ref")) {
        const name = sourceRefText(ref);
        if (name) {
          addReference(index, name, {
            uri,
            range: nodeRange(ref),
            name,
            context: "source",
          });
        }
      }
    } else if (ch.type === "target_block") {
      for (const ref of children(ch, "source_ref")) {
        const name = sourceRefText(ref);
        if (name) {
          addReference(index, name, {
            uri,
            range: nodeRange(ref),
            name,
            context: "target",
          });
        }
      }
    }

    // Index spread refs inside mapping body
    if (ch.type === "source_block" || ch.type === "target_block") continue;
    indexArrowSpreadRefs(index, uri, ch);
  }
}

function indexArrowSpreadRefs(
  index: WorkspaceIndex,
  uri: string,
  node: SyntaxNode,
): void {
  // Walk all descendants looking for fragment_spread nodes
  walkDescendants(node, (n) => {
    if (n.type === "fragment_spread") {
      const sl = child(n, "spread_label");
      const name = sl ? spreadLabelText(sl) : null;
      if (name) {
        addReference(index, name, {
          uri,
          range: nodeRange(n),
          name,
          context: "spread",
        });
      }
    }
  });
}

function indexSpreadRefs(
  index: WorkspaceIndex,
  uri: string,
  body: SyntaxNode,
): void {
  for (const spread of children(body, "fragment_spread")) {
    const sl = child(spread, "spread_label");
    const name = sl ? spreadLabelText(sl) : null;
    if (name) {
      addReference(index, name, {
        uri,
        range: nodeRange(spread),
        name,
        context: "spread",
      });
    }
  }
}

function indexMetricRefs(
  index: WorkspaceIndex,
  uri: string,
  metricNode: SyntaxNode,
  _namespace: string | null,
): void {
  // Metric sources are in the metadata block as "source <name>" key-value pairs
  const meta = child(metricNode, "metadata_block");
  if (!meta) return;

  walkDescendants(meta, (n) => {
    if (n.type === "tag_with_value") {
      const keyNode = n.namedChildren[0];
      if (keyNode?.text === "source") {
        // Value can be identifier, qualified_name, or braced list (inside value_text)
        const valNode = n.namedChildren[1];
        if (valNode) {
          const name = valNode.text;
          addReference(index, name, {
            uri,
            range: nodeRange(valNode),
            name,
            context: "metric_source",
          });
        }
      }
    }
  });
}

// ---------- Field extraction ----------

function extractFields(body: SyntaxNode | null): FieldInfo[] {
  if (!body) return [];
  const fields: FieldInfo[] = [];

  for (const fieldNode of children(body, "field_decl")) {
    const nameNode = child(fieldNode, "field_name");
    if (!nameNode) continue;
    const name = fieldNameText(nameNode);
    if (!name) continue;

    const typeExpr = child(fieldNode, "type_expr");
    const nestedBody = child(fieldNode, "schema_body");
    const isList = fieldNode.children.some((c) => c.type === "list_of");
    const isRecord = fieldNode.children.some((c) => c.type === "record");

    let type: string | null = null;
    if (isList && isRecord) type = "list_of record";
    else if (isRecord) type = "record";
    else if (isList && typeExpr) type = `list_of ${typeExpr.text}`;
    else if (typeExpr) type = typeExpr.text;

    fields.push({
      name,
      type,
      range: nodeRange(nameNode),
      children: nestedBody ? extractFields(nestedBody) : [],
    });
  }

  return fields;
}

// ---------- Text extraction helpers ----------

function sourceRefText(ref: SyntaxNode): string | null {
  const qn = child(ref, "qualified_name");
  if (qn) return qualifiedNameText(qn);
  const bn = child(ref, "backtick_name");
  if (bn) return bn.text.slice(1, -1);
  const id = child(ref, "identifier");
  if (id) return id.text;
  const ns = child(ref, "nl_string");
  if (ns) return ns.text.slice(1, -1);
  return null;
}

function qualifiedNameText(qn: SyntaxNode): string {
  const ids = qn.namedChildren.filter((c) => c.type === "identifier");
  if (ids.length >= 2 && ids[0] && ids[1]) return `${ids[0].text}::${ids[1].text}`;
  return qn.text;
}

function importNameText(node: SyntaxNode): string | null {
  const qn = child(node, "qualified_name");
  if (qn) return qualifiedNameText(qn);
  const quoted = child(node, "quoted_name");
  if (quoted) return quoted.text.slice(1, -1);
  const id = child(node, "identifier");
  if (id) return id.text;
  return null;
}

function spreadLabelText(node: SyntaxNode): string | null {
  const qn = child(node, "qualified_name");
  if (qn) return qualifiedNameText(qn);
  const quoted = child(node, "quoted_name");
  if (quoted) return quoted.text.slice(1, -1);
  // Multi-word spread: join all identifier children
  const ids = node.namedChildren.filter((c) => c.type === "identifier");
  if (ids.length > 0) return ids.map((i) => i.text).join(" ");
  return node.text;
}

function fieldNameText(nameNode: SyntaxNode): string | null {
  const inner = nameNode.namedChildren[0];
  if (!inner) return nameNode.text;
  if (inner.type === "backtick_name") return inner.text.slice(1, -1);
  return inner.text;
}

// ---------- Internal helpers ----------

function addDefinition(
  index: WorkspaceIndex,
  name: string,
  entry: DefinitionEntry,
): void {
  const existing = index.definitions.get(name) ?? [];
  existing.push(entry);
  index.definitions.set(name, existing);
}

function addReference(
  index: WorkspaceIndex,
  name: string,
  entry: ReferenceEntry,
): void {
  const existing = index.references.get(name) ?? [];
  existing.push(entry);
  index.references.set(name, existing);
}

function walkDescendants(node: SyntaxNode, fn: (n: SyntaxNode) => void): void {
  for (const ch of node.namedChildren) {
    fn(ch);
    walkDescendants(ch, fn);
  }
}
