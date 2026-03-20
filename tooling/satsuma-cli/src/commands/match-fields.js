/**
 * match-fields.js — `satsuma match-fields --source <schema> --target <schema>` command
 *
 * Deterministic normalized name comparison between two schemas.
 *
 * Flags:
 *   --matched-only    show only matched pairs
 *   --unmatched-only  show only unmatched fields
 *   --json            structured JSON output
 */

import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { matchFields } from "../normalize.js";

/** @param {import('commander').Command} program */
export function register(program) {
  program
    .command("match-fields [path]")
    .description("Match fields between source and target schemas by normalized name")
    .requiredOption("--source <schema>", "source schema name")
    .requiredOption("--target <schema>", "target schema name")
    .option("--matched-only", "show only matched pairs")
    .option("--unmatched-only", "show only unmatched fields")
    .option("--json", "structured JSON output")
    .action(async (pathArg, opts) => {
      const root = pathArg ?? ".";
      let files;
      try {
        files = await resolveInput(root);
      } catch (err) {
        console.error(`Error resolving path: ${err.message}`);
        process.exit(1);
      }

      const parsedFiles = files.map((f) => parseFile(f));
      const index = buildIndex(parsedFiles);

      // Validate schemas
      const resolvedNames = {};
      for (const name of [opts.source, opts.target]) {
        const resolved = resolveIndexKey(name, index.schemas);
        if (!resolved) {
          console.error(`Schema '${name}' not found.`);
          const close = [...index.schemas.keys()].find(
            (k) => k.toLowerCase() === name.toLowerCase(),
          );
          if (close) console.error(`Did you mean '${close}'?`);
          process.exit(1);
        }
        resolvedNames[name] = resolved;
      }

      const srcFields = resolvedNames[opts.source].entry.fields;
      const tgtFields = resolvedNames[opts.target].entry.fields;
      const result = matchFields(srcFields, tgtFields);

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (opts.matchedOnly) {
        if (result.matched.length === 0) {
          console.log("No matches found.");
          return;
        }
        for (const m of result.matched) {
          console.log(`  ${m.source} <-> ${m.target}  (${m.normalized})`);
        }
        return;
      }

      if (opts.unmatchedOnly) {
        if (result.sourceOnly.length === 0 && result.targetOnly.length === 0) {
          console.log("All fields matched.");
          return;
        }
        if (result.sourceOnly.length > 0) {
          console.log(`Source-only (${result.sourceOnly.length}):`);
          for (const f of result.sourceOnly) console.log(`  ${f}`);
        }
        if (result.targetOnly.length > 0) {
          console.log(`Target-only (${result.targetOnly.length}):`);
          for (const f of result.targetOnly) console.log(`  ${f}`);
        }
        return;
      }

      // Default: show all
      console.log(
        `Matched: ${result.matched.length}, Source-only: ${result.sourceOnly.length}, Target-only: ${result.targetOnly.length}`,
      );
      console.log();

      if (result.matched.length > 0) {
        console.log("Matched:");
        for (const m of result.matched) {
          console.log(`  ${m.source} <-> ${m.target}  (${m.normalized})`);
        }
        console.log();
      }

      if (result.sourceOnly.length > 0) {
        console.log("Source-only:");
        for (const f of result.sourceOnly) console.log(`  ${f}`);
        console.log();
      }

      if (result.targetOnly.length > 0) {
        console.log("Target-only:");
        for (const f of result.targetOnly) console.log(`  ${f}`);
      }
    });
}
