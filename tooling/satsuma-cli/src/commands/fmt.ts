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
          const rel = displayPath(filePath);
          console.error(`skipping ${rel}: parse error (${parsed.errorCount} error(s))`);
          parseErrors++;
          continue;
        }

        const formatted = format(parsed.tree, parsed.src);

        if (formatted === parsed.src) {
          continue; // already formatted
        }

        wouldChange++;
        const rel = displayPath(filePath);

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

/** Return the shorter of the relative and absolute path. */
function displayPath(filePath: string): string {
  const rel = relative(process.cwd(), filePath);
  // If relative path starts with excessive ../, prefer absolute
  if (rel.startsWith("..") && filePath.length < rel.length) return filePath;
  return rel;
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

  // Build edit script using Myers-style diff (O(ND) but simple)
  const ops = diffLines(origLines, fmtLines);

  // Group into hunks with 3 lines of context
  const CTX = 3;
  const hunks: Array<{ origStart: number; origLen: number; fmtStart: number; fmtLen: number; lines: string[] }> = [];
  let hunk: typeof hunks[0] | null = null;
  let oi = 0;
  let fi = 0;

  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]!;
    if (op === "equal") {
      // Check if we need to start or extend a hunk (look ahead for changes within CTX*2+1)
      const inRange = hunk && (oi - (hunk.origStart + hunk.origLen) < CTX * 2 + 1);
      if (hunk && inRange) {
        hunk.lines.push(` ${origLines[oi]}`);
        hunk.origLen = oi - hunk.origStart + 1;
        hunk.fmtLen = fi - hunk.fmtStart + 1;
      }
      oi++;
      fi++;
    } else if (op === "delete") {
      if (!hunk) {
        const ctxStart = Math.max(0, oi - CTX);
        hunk = { origStart: ctxStart, origLen: 0, fmtStart: Math.max(0, fi - CTX + (oi - ctxStart) - (oi - ctxStart)), fmtLen: 0, lines: [] };
        hunk.fmtStart = fi - (oi - ctxStart);
        for (let c = ctxStart; c < oi; c++) {
          hunk.lines.push(` ${origLines[c]}`);
        }
        hunk.origLen = oi - ctxStart;
        hunk.fmtLen = fi - hunk.fmtStart;
      }
      hunk.lines.push(`-${origLines[oi]}`);
      hunk.origLen = oi - hunk.origStart + 1;
      oi++;
    } else if (op === "insert") {
      if (!hunk) {
        const ctxStart = Math.max(0, oi - CTX);
        hunk = { origStart: ctxStart, origLen: 0, fmtStart: 0, fmtLen: 0, lines: [] };
        hunk.fmtStart = fi - (oi - ctxStart);
        for (let c = ctxStart; c < oi; c++) {
          hunk.lines.push(` ${origLines[c]}`);
        }
        hunk.origLen = oi - ctxStart;
        hunk.fmtLen = fi - hunk.fmtStart;
      }
      hunk.lines.push(`+${fmtLines[fi]}`);
      hunk.fmtLen = fi - hunk.fmtStart + 1;
      fi++;
    }

    // Check if the next operation is far enough away to flush the hunk
    const nextChange = findNextChange(ops, k + 1);
    if (hunk && (nextChange === -1 || isNextChangeFar(ops, k + 1, oi, CTX))) {
      // Add trailing context
      const trailEnd = Math.min(oi + CTX, origLines.length);
      for (let c = oi; c < trailEnd; c++) {
        hunk.lines.push(` ${origLines[c]}`);
      }
      hunk.origLen = (oi + Math.min(CTX, origLines.length - oi)) - hunk.origStart;
      hunk.fmtLen = (fi + Math.min(CTX, fmtLines.length - fi)) - hunk.fmtStart;
      hunks.push(hunk);
      hunk = null;
    }
  }
  if (hunk) hunks.push(hunk);

  for (const h of hunks) {
    console.log(`@@ -${h.origStart + 1},${h.origLen} +${h.fmtStart + 1},${h.fmtLen} @@`);
    for (const l of h.lines) console.log(l);
  }
}

type DiffOp = "equal" | "delete" | "insert";

function diffLines(a: string[], b: string[]): DiffOp[] {
  // Simple LCS-based diff for reasonable file sizes
  const n = a.length;
  const m = b.length;

  // For large files, use a faster greedy approach
  if (n + m > 10000) return greedyDiff(a, b);

  // Build LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  // Backtrack to build edit script
  const ops: DiffOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push("equal");
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      ops.push("insert");
      j--;
    } else {
      ops.push("delete");
      i--;
    }
  }
  ops.reverse();
  return ops;
}

function greedyDiff(a: string[], b: string[]): DiffOp[] {
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push("equal");
      i++;
      j++;
    } else {
      // Look ahead for a match
      let foundI = -1;
      let foundJ = -1;
      for (let d = 1; d < 50; d++) {
        if (i + d < a.length && a[i + d] === b[j]) { foundI = i + d; break; }
        if (j + d < b.length && a[i] === b[j + d]) { foundJ = j + d; break; }
      }
      if (foundI >= 0 && (foundJ < 0 || foundI - i <= foundJ - j)) {
        while (i < foundI) { ops.push("delete"); i++; }
      } else if (foundJ >= 0) {
        while (j < foundJ) { ops.push("insert"); j++; }
      } else {
        ops.push("delete");
        i++;
      }
    }
  }
  while (i < a.length) { ops.push("delete"); i++; }
  while (j < b.length) { ops.push("insert"); j++; }
  return ops;
}

function findNextChange(ops: DiffOp[], from: number): number {
  for (let i = from; i < ops.length; i++) {
    if (ops[i] !== "equal") return i;
  }
  return -1;
}

function isNextChangeFar(ops: DiffOp[], from: number, currentOi: number, ctx: number): boolean {
  let equalsInARow = 0;
  for (let i = from; i < ops.length; i++) {
    if (ops[i] === "equal") {
      equalsInARow++;
      if (equalsInARow > ctx * 2) return true;
    } else {
      return false;
    }
  }
  return true; // end of file
}
