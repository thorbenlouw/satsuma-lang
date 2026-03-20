/**
 * workspace.js — Satsuma workspace file discovery
 *
 * Finds .stm files in a directory tree. When given a single file, follows
 * import declarations to discover referenced files recursively.
 */

import { readdir, stat } from "fs/promises";
import { readFileSync, statSync } from "fs";
import { createRequire } from "module";
import { join, dirname, extname, resolve } from "path";
import { extractImports } from "./extract.js";

/**
 * Lazy-initialised parser for import extraction. Defers native binding load
 * until actually needed (single-file mode with imports).
 */
let _importParser = null;
function getImportParser() {
  if (!_importParser) {
    const require = createRequire(import.meta.url);
    const Parser = require("tree-sitter");
    const STM = require("tree-sitter-satsuma");
    _importParser = new Parser();
    _importParser.setLanguage(STM);
  }
  return _importParser;
}

/**
 * Recursively find all .stm files under `dir`.
 * Returns an array of absolute paths, sorted lexicographically.
 *
 * @param {string} dir  Directory to search
 * @returns {Promise<string[]>}
 */
export async function findStmFiles(dir) {
  const results = [];
  await walk(resolve(dir), results);
  return results.sort();
}

async function walk(dir, acc) {
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
 *
 * @param {string} entryFile  Absolute path to the entry .stm file
 * @returns {string[]}  Sorted, deduplicated absolute paths (includes entryFile)
 */
function followImports(entryFile) {
  const visited = new Set();
  const queue = [entryFile];
  const parser = getImportParser();

  while (queue.length > 0) {
    const filePath = queue.pop();
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
 *
 * @param {string} pathArg  File or directory path from CLI argument
 * @returns {Promise<string[]>}
 */
export async function resolveInput(pathArg) {
  const abs = resolve(pathArg);
  const s = await stat(abs);
  if (s.isDirectory()) {
    return findStmFiles(abs);
  }
  return followImports(abs);
}
