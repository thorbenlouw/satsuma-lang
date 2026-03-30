#!/usr/bin/env node

// Packages satsuma-cli for distribution, producing satsuma-cli.tgz.
//
// The @satsuma/core dependency is installed as a file: symlink pointing to
// ../satsuma-core. npm pack follows symlinks and creates tarball entries with
// '..' in their paths, which npm then rejects on install (TAR_ENTRY_ERROR).
// This script replaces the symlink with a real copy before packing so the
// tarball is fully self-contained with no ../ path entries.
//
// Run via `npm run pack` locally or from CI. Both must use this script so that
// the tarball is produced identically in every environment.

import { execFileSync } from "child_process";
import { cpSync, existsSync, readdirSync, renameSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const satsumaCore = join(cliRoot, "..", "satsuma-core");
const bundledCore = join(cliRoot, "node_modules", "@satsuma", "core");

// --- Step 1: replace the file: symlink with a real directory copy -----------

if (!existsSync(satsumaCore)) {
  throw new Error(`pack: satsuma-core not found at ${satsumaCore}`);
}

if (existsSync(bundledCore)) {
  rmSync(bundledCore, { recursive: true, force: true });
}

cpSync(satsumaCore, bundledCore, { recursive: true });
console.log("pack: replaced @satsuma/core symlink with a real directory copy");

// --- Step 2: run npm pack ---------------------------------------------------

execFileSync("npm", ["pack"], { cwd: cliRoot, stdio: "inherit" });

// --- Step 3: rename to a stable filename ------------------------------------

const [generatedTarball] = readdirSync(cliRoot).filter(
  (f) => f.startsWith("satsuma-cli-") && f.endsWith(".tgz"),
);

if (!generatedTarball) {
  throw new Error("pack: npm pack did not produce a satsuma-cli-*.tgz file");
}

renameSync(join(cliRoot, generatedTarball), join(cliRoot, "satsuma-cli.tgz"));
console.log(`pack: renamed ${generatedTarball} → satsuma-cli.tgz`);

// --- Step 4: verify the tarball ---------------------------------------------

execFileSync("node", ["scripts/verify-pack.js"], { cwd: cliRoot, stdio: "inherit" });
