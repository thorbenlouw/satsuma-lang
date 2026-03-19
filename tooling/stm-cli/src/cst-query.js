/**
 * cst-query.js — Namespace-aware CST lookup helpers.
 */

function splitQualifiedName(name) {
  if (!name || !name.includes("::")) return { namespace: null, localName: name };
  const idx = name.indexOf("::");
  return {
    namespace: name.slice(0, idx),
    localName: name.slice(idx + 2),
  };
}

export function getBlockName(node) {
  const lbl = node.namedChildren.find((c) => c.type === "block_label");
  const inner = lbl?.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "quoted_name") return inner.text.slice(1, -1);
  return inner.text;
}

export function findBlockNode(rootNode, nodeType, qualifiedName) {
  const { namespace, localName } = splitQualifiedName(qualifiedName);

  for (const c of rootNode.namedChildren) {
    if (c.type === "namespace_block") {
      const nsNode = c.namedChildren.find((x) => x.type === "identifier");
      const nsName = nsNode?.text ?? null;
      if (namespace && nsName !== namespace) continue;
      const result = findBlockNodeInContainer(c, nodeType, localName);
      if (result) return result;
      continue;
    }

    if (namespace) continue;
    if (c.type === nodeType && getBlockName(c) === localName) return c;
  }

  return null;
}

function findBlockNodeInContainer(containerNode, nodeType, localName) {
  for (const c of containerNode.namedChildren) {
    if (c.type === nodeType && getBlockName(c) === localName) return c;
  }
  return null;
}
