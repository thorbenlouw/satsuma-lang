#!/usr/bin/env node
/**
 * stm — STM CLI entry point
 *
 * Dispatches to command modules under src/commands/.
 * Each command module exports a function that registers itself on the
 * commander Program object passed to it.
 */

import { program } from "commander";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf8")
);

program
  .name("stm")
  .description("STM CLI — LLM context slicer for STM workspaces")
  .version(pkg.version);

// Register commands — each module calls program.command(...)
const commands = [
  // Phase 1+: loaded as they are implemented
  "commands/summary.js",
  // "commands/schema.js",
  // "commands/metric.js",
  // "commands/mapping.js",
  // "commands/find.js",
  // "commands/lineage.js",
  // "commands/where-used.js",
  // "commands/warnings.js",
  // "commands/context.js",
];

for (const cmd of commands) {
  const mod = await import(join(__dirname, cmd));
  mod.register(program);
}

program.parse(process.argv);
