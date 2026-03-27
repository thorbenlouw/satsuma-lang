import { TextEdit, Range, Position } from "vscode-languageserver";
import { format } from "@satsuma/core/format";
import type { Tree } from "./parser-utils";

/** Initialize the formatting module. Call in test setup to load the format function. */
export async function initFormatting(): Promise<void> {
  return Promise.resolve();
}

/**
 * Compute formatting edits for a Satsuma document.
 * Returns a single TextEdit replacing the entire document if formatting
 * would change anything, or an empty array if already formatted.
 */
export function computeFormatting(tree: Tree, source: string): TextEdit[] {
  const formatted = format(tree, source);

  if (formatted === source) {
    return []; // Already formatted — no edits needed
  }

  // Replace the entire document
  const lines = source.split("\n");
  const lastLine = lines[lines.length - 1] ?? "";
  const fullRange = Range.create(
    Position.create(0, 0),
    Position.create(lines.length - 1, lastLine.length),
  );

  return [TextEdit.replace(fullRange, formatted)];
}
