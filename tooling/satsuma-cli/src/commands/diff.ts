/**
 * diff.js — `satsuma diff <a> <b>` command
 *
 * Structural comparison of two Satsuma files or directories.
 *
 * Flags:
 *   --json         structured delta object
 *   --names-only   list changed block names only
 *   --stat         summary counts
 */

import type { Command } from "commander";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex } from "../index-builder.js";
import { diffIndex } from "../diff.js";
import type { Delta, BlockDelta, SchemaChange, MappingChange } from "../types.js";

export function register(program: Command): void {
  program
    .command("diff <a> <b>")
    .description("Structural diff between two Satsuma files or directories")
    .option("--json", "structured JSON output")
    .option("--names-only", "list changed block names only")
    .option("--stat", "summary counts only")
    .action(async (pathA: string, pathB: string, opts: { json?: boolean; namesOnly?: boolean; stat?: boolean }) => {
      let filesA: string[], filesB: string[];
      try {
        filesA = await resolveInput(pathA);
        filesB = await resolveInput(pathB);
      } catch (err: unknown) {
        console.error(`Error resolving paths: ${(err as Error).message}`);
        process.exit(1);
      }

      const indexA = buildIndex(filesA.map((f) => parseFile(f)));
      const indexB = buildIndex(filesB.map((f) => parseFile(f)));
      const delta = diffIndex(indexA, indexB);

      if (opts.json) {
        console.log(JSON.stringify(delta, null, 2));
        return;
      }

      const hasChanges =
        delta.schemas.added.length > 0 ||
        delta.schemas.removed.length > 0 ||
        delta.schemas.changed.length > 0 ||
        delta.mappings.added.length > 0 ||
        delta.mappings.removed.length > 0 ||
        delta.mappings.changed.length > 0;

      if (!hasChanges) {
        console.log("No structural differences.");
        return;
      }

      if (opts.stat) {
        printStat(delta);
        return;
      }

      if (opts.namesOnly) {
        printNamesOnly(delta);
        return;
      }

      printDefault(delta);
    });
}

function printStat(delta: Delta): void {
  const counts: Record<string, number> = {
    "schemas added": delta.schemas.added.length,
    "schemas removed": delta.schemas.removed.length,
    "schemas changed": delta.schemas.changed.length,
    "mappings added": delta.mappings.added.length,
    "mappings removed": delta.mappings.removed.length,
    "mappings changed": delta.mappings.changed.length,
  };
  for (const [label, count] of Object.entries(counts)) {
    if (count > 0) console.log(`  ${count} ${label}`);
  }
}

function printNamesOnly(delta: Delta): void {
  const names = new Set<string>();
  for (const n of [
    ...delta.schemas.added,
    ...delta.schemas.removed,
    ...delta.schemas.changed.map((c) => c.name),
    ...delta.mappings.added,
    ...delta.mappings.removed,
    ...delta.mappings.changed.map((c) => c.name),
  ]) {
    names.add(n);
  }
  for (const n of [...names].sort()) {
    console.log(n);
  }
}

function printDefault(delta: Delta): void {
  printSection("Schemas", delta.schemas);
  printSection("Mappings", delta.mappings);
}

function printSection(label: string, section: BlockDelta<SchemaChange | MappingChange>): void {
  const total =
    section.added.length + section.removed.length + section.changed.length;
  if (total === 0) return;

  console.log(`${label}:`);
  for (const name of section.added) {
    console.log(`  + ${name}`);
  }
  for (const name of section.removed) {
    console.log(`  - ${name}`);
  }
  for (const { name, changes } of section.changed) {
    console.log(`  ~ ${name}`);
    for (const c of changes) {
      if (c.kind === "field-added") {
        console.log(`      + field ${(c as SchemaChange).field}`);
      } else if (c.kind === "field-removed") {
        console.log(`      - field ${(c as SchemaChange).field}`);
      } else if (c.kind === "type-changed") {
        console.log(`      ~ ${(c as SchemaChange).field}: ${(c as SchemaChange).from} -> ${(c as SchemaChange).to}`);
      } else if (c.kind === "arrow-count-changed") {
        console.log(`      ~ arrows: ${(c as MappingChange).from} -> ${(c as MappingChange).to}`);
      } else if (c.kind === "sources-changed") {
        console.log(`      ~ sources: ${((c as MappingChange).from as string[]).join(", ")} -> ${((c as MappingChange).to as string[]).join(", ")}`);
      } else if (c.kind === "targets-changed") {
        console.log(`      ~ targets: ${((c as MappingChange).from as string[]).join(", ")} -> ${((c as MappingChange).to as string[]).join(", ")}`);
      }
    }
  }
  console.log();
}
