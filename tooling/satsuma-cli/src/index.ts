#!/usr/bin/env node
/**
 * satsuma — Satsuma CLI entry point
 *
 * Dispatches to command modules under src/commands/.
 * Each command module exports a function that registers itself on the
 * commander Program object passed to it.
 */

import type { Command } from "commander";
import { program } from "commander";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf8"),
) as { version: string };

program
  .name("satsuma")
  .description(
    "Satsuma CLI — deterministic structural extraction for Satsuma workspaces.\n" +
    "Extracts structural facts and delivers NL content verbatim. Does not interpret natural language.",
  )
  .version(pkg.version)
  .showHelpAfterError(true);

// Unhandled rejections go to stderr with exit 2
process.on("unhandledRejection", (err: unknown) => {
  console.error(`Unhandled error: ${(err as { message?: string })?.message ?? String(err)}`);
  process.exit(2);
});

// Register commands — each module calls program.command(...)
const commands = [
  // Phase 1+: loaded as they are implemented
  "commands/summary.js",
  "commands/schema.js",
  "commands/metric.js",
  "commands/mapping.js",
  "commands/find.js",
  "commands/lineage.js",
  "commands/where-used.js",
  "commands/warnings.js",
  "commands/context.js",
  "commands/arrows.js",
  "commands/fields.js",
  "commands/nl.js",
  "commands/meta.js",
  "commands/match-fields.js",
  "commands/validate.js",
  "commands/diff.js",
  "commands/nl-refs.js",
  "commands/graph.js",
  "commands/lint.js",
];

for (const cmd of commands) {
  const mod = await import(join(__dirname, cmd)) as { register: (program: Command) => void };
  mod.register(program);
}

program.parse(process.argv);
