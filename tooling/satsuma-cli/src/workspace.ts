/**
 * workspace.ts — Satsuma workspace file discovery
 *
 * Finds .stm files in a directory tree. When given a single file, follows
 * import declarations to discover referenced files recursively.
 */

import { readdir, stat } from "fs/promises";
import { readFileSync, statSync } from "fs";
import { createRequire } from "module";
import { join, dirname, extname, resolve } from "path";
import { extractImports } from "./extract.js";
import type { Tree } from "./types.js";

interface TSParser {
  setLanguage(lang: unknown): void;
  parse(source: string): Tree;
}

/**
 * Lazy-initialised parser for import extraction. Defers native binding load
 * until actually needed (single-file mode with imports).
 */
let _importParser: TSParser | null = null;
function getImportParser(): TSParser {
  if (!_importParser) {
    const require = createRequire(import.meta.url);
    // CJS interop — tree-sitter has no ESM or @types exports
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const Parser = require("tree-sitter");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const STM = require("tree-sitter-satsuma");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    _importParser = new Parser() as TSParser;
    _importParser.setLanguage(STM);
  }
  return _importParser;
}

/**
 * Recursively find all .stm files under `dir`.
 * Returns an array of absolute paths, sorted lexicographically.
 */
export async function findStmFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  await walk(resolve(dir), results);
  return results.sort();
}

async function walk(dir: string, acc: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // skip unreadable directories
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip hidden directories and node_modules
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      await walk(fullPath, acc);
    } else if (entry.isFile() && extname(entry.name) === ".stm") {
      acc.push(fullPath);
    }
  }
}

/**
 * Follow import declarations from a single .stm file, collecting all
 * transitively imported file paths. Uses a visited set for cycle safety.
 *
 * Missing import targets are warned on stderr but do not halt discovery.
 */
function followImports(entryFile: string): string[] {
  const visited = new Set<string>();
  const queue = [entryFile];
  const parser = getImportParser();

  while (queue.length > 0) {
    const filePath = queue.pop()!;
    if (visited.has(filePath)) continue;
    visited.add(filePath);

    let tree;
    try {
      const src = readFileSync(filePath, "utf8");
      tree = parser.parse(src);
    } catch {
      continue;
    }

    const imports = extractImports(tree.rootNode);
    const dir = dirname(filePath);

    for (const imp of imports) {
      if (!imp.path) continue;
      const resolved = resolve(dir, imp.path);

      try {
        statSync(resolved);
      } catch {
        process.stderr.write(
          `warning: import target "${imp.path}" not found (referenced from ${filePath}:${imp.row + 1})\n`,
        );
        continue;
      }

      if (!visited.has(resolved)) {
        queue.push(resolved);
      }
    }
  }

  return [...visited].sort();
}

/**
 * Resolve the input argument to a list of .stm file paths.
 * Accepts a file path or a directory path.
 *
 * When given a single file, follows import declarations to discover
 * referenced files recursively.
 */
export async function resolveInput(pathArg: string): Promise<string[]> {
  const abs = resolve(pathArg);
  const s = await stat(abs);
  if (s.isDirectory()) {
    return findStmFiles(abs);
  }
  return followImports(abs);
}
