import { Location } from "vscode-languageserver";
import type { Tree } from "tree-sitter";
import { findNodeContext } from "./definition";
import {
  WorkspaceIndex,
  resolveDefinition,
  findReferences as indexFindReferences,
} from "./workspace-index";

/**
 * Compute all references for the symbol at the given position.
 * Returns Location[] spanning potentially multiple files.
 */
export function computeReferences(
  tree: Tree,
  line: number,
  character: number,
  _uri: string,
  index: WorkspaceIndex,
  includeDeclaration: boolean,
): Location[] {
  const node = tree.rootNode.descendantForPosition({
    row: line,
    column: character,
  });
  if (!node) return [];

  const ctx = findNodeContext(node);
  if (!ctx) return [];

  // Determine the canonical name to search for
  const name = ctx.name;
  if (!name) return [];

  const results: Location[] = [];

  // Add all reference locations
  const refs = indexFindReferences(index, name);
  for (const ref of refs) {
    results.push(Location.create(ref.uri, ref.range));
  }

  // Optionally include the declaration itself
  if (includeDeclaration) {
    const defs = resolveDefinition(index, name, ctx.namespace);
    for (const def of defs) {
      results.push(Location.create(def.uri, def.selectionRange));
    }
  }

  return results;
}
