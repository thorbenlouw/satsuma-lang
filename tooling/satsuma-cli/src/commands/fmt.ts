/**
 * fmt.ts — `satsuma fmt` command
 *
 * Opinionated Satsuma formatter. Zero configuration, one canonical style.
 *
 * Flags:
 *   --check   exit 1 if any file would change (for CI)
 *   --diff    print unified diff without writing
 *   --stdin   read from stdin, write formatted output to stdout
 *
 * Exit codes:
 *   0  success (or all files already formatted in --check mode)
 *   1  files would change (--check mode only)
 *   2  parse errors or other failures
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import type { Command } from "commander";
import { findStmFiles } from "../workspace.js";
import { parseFile, parseSource } from "../parser.js";
import { format } from "../format.js";

export function register(program: Command): void {
  program
    .command("fmt [path]")
    .description("Format Satsuma files (opinionated, zero-config)")
    .option("--check", "exit 1 if any file would change (for CI)")
    .option("--diff", "print unified diff without writing")
    .option("--stdin", "read from stdin, write to stdout")
    .action(async (
      pathArg: string | undefined,
      opts: { check?: boolean; diff?: boolean; stdin?: boolean }
    ) => {
      if (opts.stdin) {
        return handleStdin();
      }

      const root = resolve(pathArg ?? ".");
      let files: string[];
      try {
        const stat = await import("node:fs").then(m => m.statSync(root));
        if (stat.isFile()) {
          files = [root];
        } else if (stat.isDirectory()) {
          files = await findStmFiles(root);
        } else {
          console.error(`Not a file or directory: ${root}`);
          process.exit(2);
        }
      } catch (err: unknown) {
        console.error(`Error resolving path: ${(err as Error).message}`);
        process.exit(2);
      }

      if (files.length === 0) {
        // No files to format — success
        process.exit(0);
      }

      let wouldChange = 0;
      let parseErrors = 0;

      for (const filePath of files) {
        const parsed = parseFile(filePath);

        if (parsed.errorCount > 0) {
          const rel = relative(process.cwd(), filePath);
          console.error(`skipping ${rel}: parse error (${parsed.errorCount} error(s))`);
          parseErrors++;
          continue;
        }

        const formatted = format(parsed.tree, parsed.src);

        if (formatted === parsed.src) {
          continue; // already formatted
        }

        wouldChange++;
        const rel = relative(process.cwd(), filePath);

        if (opts.check) {
          console.log(rel);
        } else if (opts.diff) {
          printDiff(rel, parsed.src, formatted);
        } else {
          writeFileSync(filePath, formatted, "utf8");
          console.log(`formatted ${rel}`);
        }
      }

      if (parseErrors > 0 && wouldChange === 0 && !opts.check) {
        process.exit(2);
      }

      if (opts.check && wouldChange > 0) {
        console.error(`\n${wouldChange} file(s) would be reformatted`);
        process.exit(1);
      }
    });
}

function handleStdin(): void {
  const src = readFileSync(0, "utf8"); // fd 0 = stdin
  const { tree, errorCount } = parseSource(src);

  if (errorCount > 0) {
    console.error(`stdin: parse error (${errorCount} error(s))`);
    process.exit(2);
  }

  const formatted = format(tree, src);
  process.stdout.write(formatted);
}

function printDiff(filename: string, original: string, formatted: string): void {
  const origLines = original.split("\n");
  const fmtLines = formatted.split("\n");

  console.log(`--- a/${filename}`);
  console.log(`+++ b/${filename}`);

  // Simple line-by-line unified diff
  let i = 0;
  let j = 0;
  while (i < origLines.length || j < fmtLines.length) {
    if (i < origLines.length && j < fmtLines.length && origLines[i] === fmtLines[j]) {
      i++;
      j++;
      continue;
    }

    // Find the hunk boundaries
    const hunkStartI = Math.max(0, i - 3);
    const hunkStartJ = Math.max(0, j - 3);

    // Scan ahead to find where lines match again
    let endI = i;
    let endJ = j;
    let found = false;
    for (let di = 0; di < 20 && i + di < origLines.length; di++) {
      for (let dj = 0; dj < 20 && j + dj < fmtLines.length; dj++) {
        if (origLines[i + di] === fmtLines[j + dj]) {
          endI = i + di;
          endJ = j + dj;
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (!found) {
      endI = origLines.length;
      endJ = fmtLines.length;
    }

    const ctxEnd = Math.min(endI + 3, origLines.length);
    console.log(`@@ -${hunkStartI + 1},${ctxEnd - hunkStartI} +${hunkStartJ + 1},${endJ - hunkStartJ + (ctxEnd - endI)} @@`);

    // Context before
    for (let k = hunkStartI; k < i; k++) {
      console.log(` ${origLines[k]}`);
    }
    // Removed lines
    for (let k = i; k < endI; k++) {
      console.log(`-${origLines[k]}`);
    }
    // Added lines
    for (let k = j; k < endJ; k++) {
      console.log(`+${fmtLines[k]}`);
    }
    // Context after
    for (let k = endI; k < ctxEnd; k++) {
      console.log(` ${origLines[k]}`);
    }

    i = ctxEnd;
    j = endJ + (ctxEnd - endI);
  }
}
