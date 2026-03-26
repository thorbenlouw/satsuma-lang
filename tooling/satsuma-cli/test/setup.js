/**
 * setup.js — Shared test setup for WASM parser initialization.
 *
 * Import this module in any test that uses parseFile() or parseSource()
 * directly (not via the CLI subprocess).  It initialises the WASM parser
 * once before any tests run.
 *
 * Usage:  import "./setup.js";
 *   (must be imported before any module that calls parseFile/parseSource)
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initParser } from "../dist/parser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmPath = resolve(__dirname, "../dist/tree-sitter-satsuma.wasm");

await initParser(wasmPath);
