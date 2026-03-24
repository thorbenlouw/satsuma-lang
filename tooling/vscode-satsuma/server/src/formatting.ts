/**
 * formatting.ts — DocumentFormattingProvider for Satsuma LSP server
 *
 * Wires the shared format() function into the LSP formatting handler.
 * Returns a single TextEdit replacing the full document range.
 *
 * The canonical format() implementation lives in satsuma-cli/src/format.ts.
 * The esbuild bundler inlines it into server.js at build time.
 * For tsc-compiled tests, we load the CLI's compiled ESM module via
 * dynamic import (cached after first call).
 */

import { TextEdit, Range, Position } from "vscode-languageserver";
import type { Tree } from "./parser-utils";

type FormatFn = (tree: unknown, source: string) => string;

let _formatFn: FormatFn | null = null;

async function getFormatFn(): Promise<FormatFn> {
  if (_formatFn) return _formatFn;
  // Dynamic import works for both CJS test runner and esbuild bundler
  const mod = await import("../../../satsuma-cli/dist/format.js") as { format: FormatFn };
  _formatFn = mod.format;
  return _formatFn;
}

// Synchronous accessor — only works after init() has been called
function getFormatFnSync(): FormatFn {
  if (!_formatFn) {
    // Fallback: try require (works in esbuild bundle where it's inlined)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require("../../../satsuma-cli/src/format.js") as { format: FormatFn };
      _formatFn = mod.format;
    } catch {
      throw new Error("Format function not initialized — call initFormatting() first");
    }
  }
  return _formatFn;
}

/** Initialize the formatting module. Call once during server startup. */
export async function initFormatting(): Promise<void> {
  await getFormatFn();
}

/**
 * Compute formatting edits for a Satsuma document.
 * Returns a single TextEdit replacing the entire document if formatting
 * would change anything, or an empty array if already formatted.
 */
export function computeFormatting(tree: Tree, source: string): TextEdit[] {
  const formatFn = getFormatFnSync();
  const formatted = formatFn(tree, source);

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
