/**
 * warnings.js — `stm warnings` command
 *
 * Lists all warning comments (//! ...) from the workspace.
 * With --questions, lists question comments (//?  ...) instead.
 *
 * Output format (default):
 *   file.stm:12  //! some records have NULL
 *
 * Flags:
 *   --questions   show //?  comments instead of //! comments
 *   --json        structured JSON output
 */

import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex } from "../index-builder.js";

/** @param {import('commander').Command} program */
export function register(program) {
  program
    .command("warnings [path]")
    .description("List warning or question comments in the workspace")
    .option("--questions", "show question comments (//?  ...) instead")
    .option("--json", "output JSON")
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

      const items = opts.questions ? index.questions : index.warnings;
      const kind = opts.questions ? "question" : "warning";

      if (opts.json) {
        console.log(JSON.stringify({ kind, count: items.length, items }, null, 2));
        return;
      }

      if (items.length === 0) {
        console.log(`No ${kind} comments found.`);
        return;
      }

      // Group by file
      const byFile = new Map();
      for (const item of items) {
        if (!byFile.has(item.file)) byFile.set(item.file, []);
        byFile.get(item.file).push(item);
      }

      const prefix = opts.questions ? "//?" : "//!";
      for (const [file, fileItems] of byFile) {
        console.log(file);
        for (const item of fileItems) {
          console.log(`  :${item.row + 1}  ${prefix} ${item.text}`);
        }
        console.log();
      }
    });
}
