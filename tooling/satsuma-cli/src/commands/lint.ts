/**
 * lint.ts — `satsuma lint` command
 *
 * Policy-oriented linting for Satsuma workspaces.  Surfaces workspace
 * hygiene and modelling convention issues as structured diagnostics.
 *
 * Exit codes:
 *   0 — no findings (or all findings fixed with --fix)
 *   1 — internal error (filesystem, parser crash, bad arguments)
 *   2 — lint findings present
 *
 * Flags:
 *   --json     machine-readable JSON output
 *   --fix      apply safe, deterministic fixes
 *   --select   run only listed rules (comma-separated)
 *   --ignore   skip listed rules (comma-separated)
 *   --quiet    exit code only
 */

import type { Command } from "commander";
import { readFileSync, writeFileSync } from "fs";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, extractFileData } from "../index-builder.js";
import { runLint, applyFixes, RULES } from "../lint-engine.js";
import type { LintFix } from "../types.js";

export function register(program: Command): void {
  program
    .command("lint [path]")
    .description("Lint Satsuma files for policy and convention issues")
    .option("--json", "structured JSON output")
    .option("--fix", "apply safe, deterministic fixes")
    .option("--select <rules>", "run only listed rules (comma-separated)")
    .option("--ignore <rules>", "skip listed rules (comma-separated)")
    .option("--quiet", "exit code only")
    .option("--rules", "list available lint rules and exit")
    .addHelpText("after", `
Rules:
  hidden-source-in-nl  error    NL text references a schema not in the mapping's source/target list
  unresolved-nl-ref    warning  @ reference in NL does not resolve to any known identifier
  duplicate-definition error    Named definition is declared more than once in a namespace

JSON shape (--json):
  {
    "findings": [{"rule": str, "severity": str, "message": str, "file": str, "line": int, "fixable": bool}, ...],
    "fixes":    [{"rule": str, "file": str, "description": str}, ...],
    "summary":  {"files": int, "findings": int, "fixable": int, "fixed": int}
  }

Examples:
  satsuma lint                               # check workspace conventions
  satsuma lint --json                        # structured diagnostics
  satsuma lint --fix                         # auto-fix fixable issues
  satsuma lint --rules                       # list available rules
  satsuma lint --select hidden-source-in-nl  # run one rule only`)
    .action(async (pathArg: string | undefined, opts: { json?: boolean; fix?: boolean; select?: string; ignore?: string; quiet?: boolean; rules?: boolean }) => {
      // --rules: list available rules and exit
      if (opts.rules) {
        for (const r of RULES) {
          console.log(`  ${r.id.padEnd(24)} ${r.description}`);
        }
        return;
      }

      const root = pathArg ?? ".";
      let files: string[];
      try {
        files = await resolveInput(root);
      } catch (err: unknown) {
        console.error(`Error resolving path: ${(err as Error).message}`);
        process.exit(2);
      }

      // Parse and extract — tree-sitter reuses a single parser buffer,
      // so we must extract data while each tree is still valid.
      const extracted = [];
      for (const f of files) {
        const parsed = parseFile(f);
        extracted.push(extractFileData(parsed));
      }

      const index = buildIndex(extracted);

      // Run lint rules
      const ruleOpts: { select?: string[]; ignore?: string[] } = {};
      if (opts.select) ruleOpts.select = opts.select.split(",").map((s) => s.trim());
      if (opts.ignore) ruleOpts.ignore = opts.ignore.split(",").map((s) => s.trim());

      let diagnostics = runLint(index, ruleOpts);

      // --fix: apply safe fixes
      let appliedFixes: LintFix[] = [];
      if (opts.fix && diagnostics.some((d) => d.fixable)) {
        // Read source files that have fixable diagnostics
        const fixableFiles = new Set(
          diagnostics.filter((d) => d.fixable && d.fix).map((d) => d.fix!.file),
        );
        const sourceByFile = new Map<string, string>();
        for (const f of fixableFiles) {
          try {
            sourceByFile.set(f, readFileSync(f, "utf8"));
          } catch {
            // skip files that can't be read
          }
        }

        const result = applyFixes(sourceByFile, diagnostics);
        appliedFixes = result.appliedFixes;

        // Write fixed files
        for (const [file, content] of result.fixedFiles) {
          writeFileSync(file, content, "utf8");
        }

        // Remove fixed diagnostics from the output
        const fixedRules = new Set(appliedFixes.map((f) => `${f.file}:${f.rule}`));
        diagnostics = diagnostics.filter(
          (d) => !d.fixable || !fixedRules.has(`${d.file}:${d.rule}`),
        );
      }

      const findingCount = diagnostics.length;
      const fixableCount = diagnostics.filter((d) => d.fixable).length;

      // --quiet: exit code only
      if (opts.quiet) {
        process.exit(findingCount > 0 ? 2 : 0);
      }

      // --json: structured output
      if (opts.json) {
        const payload = {
          findings: diagnostics.map(({ fix: _fix, ...rest }) => rest),
          fixes: appliedFixes.map(({ apply: _apply, ...rest }) => rest),
          summary: {
            files: extracted.length,
            findings: findingCount,
            fixable: fixableCount,
            fixed: appliedFixes.length,
          },
        };
        console.log(JSON.stringify(payload, null, 2));
        process.exit(findingCount > 0 ? 2 : 0);
      }

      // Text output
      if (appliedFixes.length > 0) {
        for (const fix of appliedFixes) {
          console.log(`Fixed: ${fix.file} [${fix.rule}] ${fix.description}`);
        }
        console.log();
      }

      if (findingCount === 0 && appliedFixes.length === 0) {
        console.log(
          `Linted ${extracted.length} file${extracted.length !== 1 ? "s" : ""}: no issues found.`,
        );
        return;
      }

      if (findingCount === 0 && appliedFixes.length > 0) {
        console.log(
          `${appliedFixes.length} fixed, no remaining issues in ${extracted.length} file${extracted.length !== 1 ? "s" : ""}`,
        );
        return;
      }

      // Print remaining findings grouped by file
      for (const d of diagnostics) {
        const sev = d.severity === "error" ? "error" : "warning";
        const fixTag = d.fixable ? " (fixable)" : "";
        console.log(
          `${d.file}:${d.line}:${d.column} ${sev} [${d.rule}] ${d.message}${fixTag}`,
        );
      }

      console.log();
      if (appliedFixes.length > 0) {
        console.log(
          `${appliedFixes.length} fixed, ${findingCount} remaining in ${extracted.length} file${extracted.length !== 1 ? "s" : ""} (${fixableCount} fixable)`,
        );
      } else {
        console.log(
          `${findingCount} finding${findingCount !== 1 ? "s" : ""} in ${extracted.length} file${extracted.length !== 1 ? "s" : ""} (${fixableCount} fixable)`,
        );
      }

      process.exit(2);
    });
}
