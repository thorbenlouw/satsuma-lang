/**
 * errors.js — Shared error handling utilities for the STM CLI
 *
 * Exit codes:
 *   0  success
 *   1  not found / no results
 *   2  parse error / invalid input
 */

export const EXIT_NOT_FOUND = 1;
export const EXIT_PARSE_ERROR = 2;

/**
 * Load and parse all .stm files from a resolved path list.
 * On parse errors, prints a warning to stderr and continues (partial parse).
 * Exits with EXIT_PARSE_ERROR if ANY file fails to be read.
 *
 * @param {string[]} files         Absolute file paths
 * @param {Function} parseFileFn   The parseFile function from parser.js
 * @returns {Array<{filePath, src, tree, errorCount}>}
 */
export function loadFiles(files, parseFileFn) {
  const parsed = [];
  let hasReadError = false;

  for (const f of files) {
    try {
      const result = parseFileFn(f);
      if (result.errorCount > 0) {
        console.error(`Warning: ${result.errorCount} parse error(s) in ${f}`);
      }
      parsed.push(result);
    } catch (err) {
      console.error(`Error: could not read or parse ${f}: ${err.message}`);
      hasReadError = true;
    }
  }

  if (hasReadError) process.exit(EXIT_PARSE_ERROR);
  return parsed;
}

/**
 * Suggest a close match from a list of available names.
 * Returns the suggestion string or null.
 *
 * @param {string} name
 * @param {string[]} available
 * @returns {string|null}
 */
export function findSuggestion(name, available) {
  // Case-insensitive exact match
  const exact = available.find((k) => k.toLowerCase() === name.toLowerCase());
  if (exact) return exact;

  // Prefix match
  const prefix = available.find((k) =>
    k.toLowerCase().startsWith(name.toLowerCase().slice(0, 3)),
  );
  return prefix ?? null;
}

/**
 * Print a "not found" error with an optional suggestion and exit 1.
 *
 * @param {string} kind    e.g. "Schema", "Metric"
 * @param {string} name    the requested name
 * @param {string[]} available  all known names
 */
export function notFound(kind, name, available) {
  const suggestion = findSuggestion(name, available);
  if (suggestion && suggestion !== name) {
    console.error(`${kind} '${name}' not found. Did you mean '${suggestion}'?`);
  } else {
    console.error(`${kind} '${name}' not found.`);
  }
  if (available.length > 0 && available.length <= 10) {
    console.error(`Available: ${available.join(", ")}`);
  } else if (available.length > 10) {
    console.error(`(${available.length} ${kind.toLowerCase()}s in workspace)`);
  }
  process.exit(EXIT_NOT_FOUND);
}

/**
 * Resolve a path argument and load files, exiting on errors.
 * Combines resolveInput + loadFiles with consistent error handling.
 */
export async function resolveAndLoad(pathArg, resolveInputFn, parseFileFn) {
  let files;
  try {
    files = await resolveInputFn(pathArg ?? ".");
  } catch (err) {
    console.error(`Error resolving path '${pathArg}': ${err.message}`);
    process.exit(EXIT_PARSE_ERROR);
  }

  if (files.length === 0) {
    console.error("No .stm files found.");
    process.exit(EXIT_NOT_FOUND);
  }

  return loadFiles(files, parseFileFn);
}
