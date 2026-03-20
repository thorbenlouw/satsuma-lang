/**
 * validate.ts — `satsuma validate` command
 *
 * Reports parse errors and semantic warnings.
 *
 * Flags:
 *   --json          array of diagnostics
 *   --errors-only   suppress warnings
 *   --quiet         exit code only (0=clean, 2=errors)
 */

import type { Command } from "commander";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, extractFileData } from "../index-builder.js";
import { collectParseErrors, collectSemanticWarnings } from "../validate.js";
import type { LintDiagnostic } from "../types.js";

export function register(program: Command): void {
  program
    .command("validate [path]")
    .description("Validate Satsuma files for parse errors and semantic issues")
    .option("--json", "structured JSON output")
    .option("--errors-only", "suppress warnings")
    .option("--quiet", "exit code only (0=clean, 2=errors)")
    .action(async (pathArg: string | undefined, opts: { json?: boolean; errorsOnly?: boolean; quiet?: boolean }) => {
      const root = pathArg ?? ".";
      let files: string[];
      try {
        files = await resolveInput(root);
      } catch (err: unknown) {
        console.error(`Error resolving path: ${(err as Error).message}`);
        process.exit(2);
      }

      // Parse each file and extract data immediately (tree-sitter reuses a
      // single parser buffer, so prior trees become invalid after a new parse).
      const extracted = [];
      const parseErrors: LintDiagnostic[] = [];
      for (const f of files) {
        const parsed = parseFile(f);
        // Collect parse errors and extract data while tree is still valid
        parseErrors.push(...collectParseErrors(parsed.tree.rootNode, parsed.filePath));
        extracted.push(extractFileData(parsed));
      }

      const index = buildIndex(extracted);

      // Collect diagnostics
      const diagnostics: LintDiagnostic[] = [...parseErrors];

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
          `Validated ${extracted.length} file${extracted.length !== 1 ? "s" : ""}: no issues found.`,
        );
        return;
      }

      // Group by file
      const byFile = new Map<string, LintDiagnostic[]>();
      for (const d of diagnostics) {
        if (!byFile.has(d.file)) byFile.set(d.file, []);
        byFile.get(d.file)!.push(d);
      }

      for (const [file, fileDiags] of byFile) {
        for (const d of fileDiags) {
          const sev = d.severity === "error" ? "error" : "warning";
          console.log(`${file}:${d.line}:${d.column} ${sev} [${d.rule}] ${d.message}`);
        }
      }

      console.log();
      console.log(
        `${errorCount} error${errorCount !== 1 ? "s" : ""}, ${warnCount} warning${warnCount !== 1 ? "s" : ""} in ${extracted.length} file${extracted.length !== 1 ? "s" : ""}`,
      );

      process.exit(errorCount > 0 ? 2 : 0);
    });
}
