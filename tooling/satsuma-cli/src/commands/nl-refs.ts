/**
 * nl-refs.ts — `satsuma nl-refs` command
 *
 * Extracts and lists all backtick-delimited references from NL blocks
 * in transform bodies. Shows each reference with its classification,
 * resolution status, containing mapping, and source location.
 *
 * Flags:
 *   --mapping <name>   scope to a specific mapping
 *   --json             structured JSON output
 *   --unresolved       show only unresolved references
 */

import type { Command } from "commander";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { resolveAllNLRefs } from "../nl-ref-extract.js";
import type { ResolvedNLRef } from "../nl-ref-extract.js";

export function register(program: Command): void {
  program
    .command("nl-refs [path]")
    .description("Extract backtick references from NL transform bodies")
    .option("--mapping <name>", "scope to a specific mapping")
    .option("--json", "structured JSON output")
    .option("--unresolved", "show only unresolved references")
    .action(async (pathArg: string | undefined, opts: { mapping?: string; json?: boolean; unresolved?: boolean }) => {
      const root = pathArg ?? ".";
      let files: string[];
      try {
        files = await resolveInput(root);
      } catch (err: unknown) {
        console.error(`Error resolving path: ${(err as Error).message}`);
        process.exit(1);
      }

      const parsedFiles = files.map((f) => parseFile(f));
      const index = buildIndex(parsedFiles);

      let refs = resolveAllNLRefs(index);

      // Apply --mapping filter
      if (opts.mapping) {
        const resolved = resolveIndexKey(opts.mapping, index.mappings);
        if (!resolved) {
          console.error(`Mapping '${opts.mapping}' not found.`);
          process.exit(1);
        }
        refs = refs.filter((r) => r.mapping === resolved.key);
      }

      // Apply --unresolved filter
      if (opts.unresolved) {
        refs = refs.filter((r) => !r.resolved);
      }

      if (refs.length === 0) {
        console.log("No NL backtick references found.");
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify(refs, null, 2));
        return;
      }

      printDefault(refs);
    });
}

function printDefault(refs: ResolvedNLRef[]): void {
  console.log(`NL backtick references (${refs.length} total):`);
  console.log();

  // Group by mapping
  const byMapping = new Map<string, ResolvedNLRef[]>();
  for (const ref of refs) {
    if (!byMapping.has(ref.mapping)) byMapping.set(ref.mapping, []);
    byMapping.get(ref.mapping)!.push(ref);
  }

  for (const [mapping, mappingRefs] of byMapping) {
    console.log(`  mapping '${mapping}':`);
    for (const ref of mappingRefs) {
      const status = ref.resolved
        ? `-> ${ref.resolvedTo?.name ?? "?"}`
        : "(unresolved)";
      const padRef = (`\`${ref.ref}\``).padEnd(32);
      const padClass = ref.classification.padEnd(28);
      console.log(`    ${padRef} ${padClass} ${status}  (line ${ref.line + 1})`);
    }
    console.log();
  }
}
