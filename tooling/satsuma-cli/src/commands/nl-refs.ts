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
    .addHelpText("after", `
Backtick references are \`field_name\` or \`schema.field\` inside "..." NL
strings. Each ref is checked against the workspace index — "resolved" means
the referenced field or schema exists, "unresolved" means it was not found.

Examples:
  satsuma nl-refs ./workspace                        # all refs across workspace
  satsuma nl-refs --mapping 'load hub_customer'      # refs in one mapping
  satsuma nl-refs --unresolved --json                # broken refs as JSON`)
    .action(async (pathArg: string | undefined, opts: { mapping?: string; json?: boolean; unresolved?: boolean }) => {
      const root = pathArg ?? ".";
      let files: string[];
      try {
        files = await resolveInput(root);
      } catch (err: unknown) {
        console.error(`Error resolving path: ${(err as Error).message}`);
        process.exit(2);
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

      if (opts.json) {
        const out = refs.map((r) => ({ ...r, line: r.line + 1 }));
        console.log(JSON.stringify(out, null, 2));
        if (refs.length === 0) process.exit(1);
        return;
      }

      if (refs.length === 0) {
        console.log("No NL backtick references found.");
        process.exit(1);
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
    // Format the label: "mapping 'name'", "metric 'name'", "schema 'name'", etc.
    let label: string;
    if (mapping.startsWith("note:metric:")) {
      label = `metric '${mapping.slice(12)}'`;
    } else if (mapping.startsWith("note:schema:")) {
      label = `schema '${mapping.slice(12)}'`;
    } else if (mapping.startsWith("note:fragment:")) {
      label = `fragment '${mapping.slice(14)}'`;
    } else if (mapping.startsWith("note:")) {
      label = `note '${mapping.slice(5)}'`;
    } else if (mapping.startsWith("transform:")) {
      label = `transform '${mapping.slice(10)}'`;
    } else {
      label = `mapping '${mapping}'`;
    }
    console.log(`  ${label}:`);
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
