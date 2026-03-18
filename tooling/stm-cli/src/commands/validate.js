/**
 * validate.js — `stm validate` command
 *
 * Reports parse errors and semantic warnings.
 *
 * Flags:
 *   --json          array of diagnostics
 *   --errors-only   suppress warnings
 *   --quiet         exit code only (0=clean, 2=errors)
 */

import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex } from "../index-builder.js";
import { collectParseErrors, collectSemanticWarnings } from "../validate.js";

/** @param {import('commander').Command} program */
export function register(program) {
  program
    .command("validate [path]")
    .description("Validate STM files for parse errors and semantic issues")
    .option("--json", "structured JSON output")
    .option("--errors-only", "suppress warnings")
    .option("--quiet", "exit code only (0=clean, 2=errors)")
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

      // Collect diagnostics
      let diagnostics = [];

      // Parse errors
      for (const { filePath, tree } of parsedFiles) {
        diagnostics.push(...collectParseErrors(tree.rootNode, filePath));
      }

      // Semantic warnings
      if (!opts.errorsOnly) {
        diagnostics.push(...collectSemanticWarnings(index));
      }

      // Sort by file, then line
      diagnostics.sort((a, b) =>
        a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column,
      );

      const errorCount = diagnostics.filter(
        (d) => d.severity === "error",
      ).length;
      const warnCount = diagnostics.filter(
        (d) => d.severity === "warning",
      ).length;

      if (opts.quiet) {
        process.exit(errorCount > 0 ? 2 : 0);
      }

      if (opts.json) {
        console.log(JSON.stringify(diagnostics, null, 2));
        process.exit(errorCount > 0 ? 2 : 0);
      }

      if (diagnostics.length === 0) {
        console.log(
          `Validated ${parsedFiles.length} file${parsedFiles.length !== 1 ? "s" : ""}: no issues found.`,
        );
        return;
      }

      // Group by file
      const byFile = new Map();
      for (const d of diagnostics) {
        if (!byFile.has(d.file)) byFile.set(d.file, []);
        byFile.get(d.file).push(d);
      }

      for (const [file, fileDiags] of byFile) {
        for (const d of fileDiags) {
          const sev = d.severity === "error" ? "error" : "warning";
          console.log(`${file}:${d.line}:${d.column} ${sev} [${d.rule}] ${d.message}`);
        }
      }

      console.log();
      console.log(
        `${errorCount} error${errorCount !== 1 ? "s" : ""}, ${warnCount} warning${warnCount !== 1 ? "s" : ""} in ${parsedFiles.length} file${parsedFiles.length !== 1 ? "s" : ""}`,
      );

      process.exit(errorCount > 0 ? 2 : 0);
    });
}
