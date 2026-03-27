#!/usr/bin/env node
/**
 * postbuild.js — Set the executable bit on the CLI entry point.
 *
 * tsc emits dist/index.js with 0o644 permissions. This script adds the
 * executable bit so that `npm link` and `npm pack` produce a working
 * binary. Uses Node's fs.chmod for cross-platform compatibility (on
 * Windows this is a harmless no-op).
 */

import { chmod, stat } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const entrypoint = join(__dirname, "..", "dist", "index.js");

try {
  const st = await stat(entrypoint);
  // Add owner/group/other execute bits to existing permissions
  await chmod(entrypoint, st.mode | 0o111);
} catch (err) {
  if (err.code === "ENOENT") {
    // dist/index.js doesn't exist yet (e.g. first install before build)
    process.exit(0);
  }
  throw err;
}
