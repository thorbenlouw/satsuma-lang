/**
 * workspace.js — STM workspace file discovery
 *
 * Finds .stm files in a directory tree. The CLI accepts either a single .stm
 * file or a directory; this module handles the directory case.
 */

import { readdir, stat } from "fs/promises";
import { join, extname, resolve } from "path";

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
 * Resolve the input argument to a list of .stm file paths.
 * Accepts a file path (returned as-is in an array) or a directory path
 * (recursively scanned for .stm files).
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
  return [abs];
}
