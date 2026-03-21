/**
 * warnings.ts — `satsuma warnings` command
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

import type { Command } from "commander";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex } from "../index-builder.js";
import type { WarningRecord, QuestionRecord } from "../types.js";

export function register(program: Command): void {
  program
    .command("warnings [path]")
    .description("List warning or question comments in the workspace")
    .option("--questions", "show question comments (//?  ...) instead")
    .option("--json", "output JSON")
    .action(async (pathArg: string | undefined, opts: { questions?: boolean; json?: boolean }) => {
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

      const items = opts.questions ? index.questions : index.warnings;
      const kind = opts.questions ? "question" : "warning";

      if (opts.json) {
        console.log(JSON.stringify({ kind, count: items.length, items }, null, 2));
        if (items.length === 0) process.exit(1);
        return;
      }

      if (items.length === 0) {
        console.log(`No ${kind} comments found.`);
        process.exit(1);
      }

      // Group by file
      const byFile = new Map<string, Array<WarningRecord | QuestionRecord>>();
      for (const item of items) {
        if (!byFile.has(item.file)) byFile.set(item.file, []);
        byFile.get(item.file)!.push(item);
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
