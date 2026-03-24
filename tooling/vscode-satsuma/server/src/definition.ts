import { Location } from "vscode-languageserver";
import type { SyntaxNode, Tree } from "./parser-utils";
import { child, labelText } from "./parser-utils";
import {
  WorkspaceIndex,
  resolveDefinition,
  getFields,
  FieldInfo,
} from "./workspace-index";

/**
 * Compute go-to-definition for the node at the given position.
 * Returns Location(s) pointing to the definition site, or null.
 */
export function computeDefinition(
  tree: Tree,
  line: number,
  character: number,
  uri: string,
  index: WorkspaceIndex,
): Location | Location[] | null {
  const node = tree.rootNode.descendantForPosition({
    row: line,
    column: character,
  });
  if (!node) return null;

  const ctx = findNodeContext(node);
  if (!ctx) return null;

  return resolveContext(ctx, uri, index);
}

// ---------- Context detection ----------

export interface NodeContext {
  kind:
    | "source_ref"
    | "target_ref"
    | "spread"
    | "import_name"
    | "import_path"
    | "block_label"
    | "field_name"
    | "unknown";
  name: string;
  namespace: string | null;
  /** For arrow field context: the source/target schemas of the enclosing mapping. */
  mappingSources?: string[];
  mappingTargets?: string[];
  /** The node we identified context from (for range info). */
  node: SyntaxNode;
}

/** Walk up from a node to determine what kind of reference it is. */
export function findNodeContext(startNode: SyntaxNode): NodeContext | null {
  let current: SyntaxNode | null = startNode;

  while (current) {
    const ctx = tryContext(current);
    if (ctx) return ctx;
    current = current.parent;
  }
  return null;
}

function tryContext(node: SyntaxNode): NodeContext | null {
  const ns = findEnclosingNamespace(node);

  switch (node.type) {
    case "source_ref": {
      const name = sourceRefText(node);
      if (!name) return null;
      const parentType = node.parent?.type;
      const inTarget = parentType === "target_block" ||
        (parentType === "_source_entry" && node.parent?.parent?.type === "target_block");
      return {
        kind: inTarget ? "target_ref" : "source_ref",
        name,
        namespace: ns,
        node,
      };
    }

    case "spread_label": {
      const name = spreadLabelText(node);
      if (!name) return null;
      return { kind: "spread", name, namespace: ns, node };
    }

    case "fragment_spread": {
      const sl = child(node, "spread_label");
      const name = sl ? spreadLabelText(sl) : null;
      if (!name) return null;
      return { kind: "spread", name, namespace: ns, node: sl ?? node };
    }

    case "import_name": {
      const name = importNameText(node);
      if (!name) return null;
      return { kind: "import_name", name, namespace: null, node };
    }

    case "import_path": {
      const text = importPathText(node);
      if (!text) return null;
      return { kind: "import_path", name: text, namespace: null, node };
    }

    case "block_label": {
      const block = node.parent;
      if (!block) return null;
      const name = labelText(block);
      if (!name) return null;
      const qualName = ns ? `${ns}::${name}` : name;
      return { kind: "block_label", name: qualName, namespace: ns, node };
    }

    case "field_name": {
      const name = fieldNameTextDef(node);
      if (!name) return null;
      return { kind: "field_name", name, namespace: ns, node };
    }

    // Handle identifiers and backtick_names that are inside source_ref, spread, etc.
    case "identifier":
    case "backtick_name":
    case "quoted_name":
    case "qualified_name":
    case "nl_string":
      // Let the parent handle it
      return null;

    default:
      return null;
  }
}

// ---------- Resolution ----------

function resolveContext(
  ctx: NodeContext,
  _uri: string,
  index: WorkspaceIndex,
): Location | Location[] | null {
  switch (ctx.kind) {
    case "source_ref":
    case "target_ref": {
      const defs = resolveDefinition(index, ctx.name, ctx.namespace);
      return defsToLocations(defs);
    }

    case "spread": {
      // Try fragment first, then transform
      let defs = resolveDefinition(index, ctx.name, ctx.namespace);
      if (defs.length === 0) {
        // Multi-word spreads might need different resolution
        defs = resolveDefinition(index, ctx.name, ctx.namespace);
      }
      return defsToLocations(defs);
    }

    case "import_name": {
      const defs = resolveDefinition(index, ctx.name, null);
      return defsToLocations(defs);
    }

    case "import_path": {
      // The name is the raw path text — the server must resolve it to a URI.
      // We return null here; the server wiring resolves import paths.
      return null;
    }

    case "block_label": {
      // Cursor is on a definition — return itself (useful for peek)
      const defs = resolveDefinition(index, ctx.name, ctx.namespace);
      return defsToLocations(defs);
    }

    case "field_name": {
      // For field names, look in the enclosing schema/fragment
      const block = findEnclosingBlock(ctx.node);
      if (!block) return null;
      const blockName = labelText(block);
      if (!blockName) return null;
      const ns = findEnclosingNamespace(ctx.node);
      const qualName = ns ? `${ns}::${blockName}` : blockName;
      const fields = getFields(index, qualName, ns);
      const fieldLoc = findFieldLocation(fields, ctx.name);
      if (fieldLoc) return fieldLoc;
      return null;
    }

    default:
      return null;
  }
}

function defsToLocations(
  defs: Array<{ uri: string; selectionRange: import("vscode-languageserver").Range }>,
): Location | Location[] | null {
  if (defs.length === 0) return null;
  if (defs.length === 1 && defs[0]) {
    return Location.create(defs[0].uri, defs[0].selectionRange);
  }
  return defs.map((d) => Location.create(d.uri, d.selectionRange));
}

function findFieldLocation(
  fields: FieldInfo[],
  name: string,
): Location | null {
  for (const f of fields) {
    if (f.name === name) {
      // FieldInfo.range points to the field_name node
      return null; // We don't have the URI in FieldInfo — caller handles
    }
    const nested = findFieldLocation(f.children, name);
    if (nested) return nested;
  }
  return null;
}

// ---------- Tree helpers ----------

function findEnclosingNamespace(node: SyntaxNode): string | null {
  let current: SyntaxNode | null = node.parent;
  while (current) {
    if (current.type === "namespace_block") {
      return current.childForFieldName("name")?.text ?? null;
    }
    current = current.parent;
  }
  return null;
}

function findEnclosingBlock(node: SyntaxNode): SyntaxNode | null {
  let current: SyntaxNode | null = node.parent;
  while (current) {
    if (
      current.type === "schema_block" ||
      current.type === "fragment_block" ||
      current.type === "transform_block" ||
      current.type === "mapping_block" ||
      current.type === "metric_block"
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

// ---------- Text extraction ----------

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

function spreadLabelText(node: SyntaxNode): string | null {
  const qn = child(node, "qualified_name");
  if (qn) return qualifiedNameText(qn);
  const quoted = child(node, "quoted_name");
  if (quoted) return quoted.text.slice(1, -1);
  const ids = node.namedChildren.filter((c) => c.type === "identifier");
  if (ids.length > 0) return ids.map((i) => i.text).join(" ");
  return node.text;
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

function importPathText(node: SyntaxNode): string | null {
  // import_path is an alias for nl_string
  const text = node.text;
  if (text.startsWith('"') && text.endsWith('"')) return text.slice(1, -1);
  return text;
}

function fieldNameTextDef(node: SyntaxNode): string | null {
  const inner = node.namedChildren[0];
  if (!inner) return node.text;
  if (inner.type === "backtick_name") return inner.text.slice(1, -1);
  return inner.text;
}
