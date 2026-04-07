/**
 * load-workspace.test.ts — Unit tests for the shared CLI workspace loader
 *
 * `loadWorkspace` is the single point through which 18 of 21 CLI commands
 * resolve, parse, and index a workspace. The behaviours under test here are
 * the contract those commands rely on:
 *
 *   • a successful load returns both the parsed files and the assembled
 *     `ExtractedWorkspace` index, with the same data shape an inline
 *     resolveInput / parseFile / buildIndex sequence used to produce;
 *   • a resolution failure (bad path, directory argument) is reported with
 *     the standard `Error resolving path '<arg>': ...` message and exits the
 *     process with `EXIT_PARSE_ERROR`;
 *   • `followImports: false` disables transitive import resolution so the
 *     loader can be used by tools that compare two single files;
 *   • a `pathArg` of `undefined` resolves the current working directory,
 *     mirroring how every CLI command treats a missing positional path.
 *
 * Process exits are observed via a `process.exit` stub so the test runner
 * is not killed; we assert on the exit code and the captured stderr.
 */

import assert from "node:assert/strict";
import { describe, it, before, beforeEach, afterEach } from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initParser } from "#src/parser.js";
import { loadWorkspace } from "#src/load-workspace.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLES = resolve(__dirname, "../../../examples");

// ── process-exit stub ────────────────────────────────────────────────────────
//
// `loadWorkspace` calls `process.exit` on resolve / load failures. The tests
// replace it with a throwing stub so the assertions can observe the exit
// without aborting the test runner. `console.error` is captured for the same
// reason — we want to assert on the message body without polluting test
// output.

class ExitCalled extends Error {
  constructor(public code: number) {
    super(`process.exit(${code})`);
  }
}

let originalExit: typeof process.exit;
let originalError: typeof console.error;
let stderrLines: string[];

beforeEach(() => {
  originalExit = process.exit;
  originalError = console.error;
  stderrLines = [];
  // The cast is required because process.exit is typed as `(code) => never`;
  // a throwing stub is the closest faithful substitute that still satisfies
  // the never-returning contract.
  process.exit = ((code?: number): never => {
    throw new ExitCalled(code ?? 0);
  }) as typeof process.exit;
  console.error = (msg: unknown) => {
    stderrLines.push(String(msg));
  };
});

afterEach(() => {
  process.exit = originalExit;
  console.error = originalError;
});

before(async () => {
  // The WASM parser must be initialised once before any parseFile call;
  // otherwise loadWorkspace explodes inside loadFiles.
  await initParser();
});

// ── happy path ───────────────────────────────────────────────────────────────

describe("loadWorkspace", () => {
  it("returns parsed files and an index whose schemas reflect the source", async () => {
    // A real example file with known schemas — verifies the round-trip from
    // path argument to a populated ExtractedWorkspace.
    const entry = resolve(EXAMPLES, "lib/common.stm");
    const { files, index } = await loadWorkspace(entry);

    assert.ok(files.length >= 1, "expected at least the entry file to be parsed");
    assert.ok(files.every((f) => f.tree && f.src), "every parsed file must carry a tree and source");
    assert.ok(index.schemas.size > 0, "common.stm defines schemas — index should be populated");
  });

  it("treats an undefined pathArg as the current working directory", async () => {
    // CLI commands that omit `[path]` pass undefined; the loader must
    // mirror the historical `pathArg ?? "."` behaviour from the inline
    // sequences it replaces. We point cwd at a directory containing a
    // single .stm file and verify the loader picks it up via the default.
    const tmp = mkdtempSync(join(tmpdir(), "satsuma-loadws-"));
    writeFileSync(join(tmp, "x.stm"), "schema s { f string }\n");
    // The default `.` resolves to a directory, which `resolveInput` rejects
    // (ADR-022). We assert the rejection path here — proving the default is
    // being applied — rather than constructing an entry-file fixture.
    const prevCwd = process.cwd();
    try {
      process.chdir(tmp);
      await assert.rejects(
        () => loadWorkspace(undefined),
        (err: Error) => err instanceof ExitCalled && err.code === 2,
      );
      assert.ok(
        stderrLines.some((l) => /Error resolving path '\.':/.test(l)),
        `expected default path '.' in stderr, got: ${stderrLines.join(" | ")}`,
      );
    } finally {
      process.chdir(prevCwd);
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("forwards followImports: false to skip transitive resolution", async () => {
    // The diff command needs to compare two files in isolation. Verifies
    // the option flows through to resolveInput and we get exactly one file
    // back even when the entry imports others.
    const entry = resolve(__dirname, "fixtures/import-entry.stm");
    const { files } = await loadWorkspace(entry, { followImports: false });
    assert.equal(files.length, 1, "followImports: false must yield only the entry file");
    assert.equal(files[0]!.filePath, entry);
  });
});

// ── failure modes ────────────────────────────────────────────────────────────

describe("loadWorkspace failure handling", () => {
  it("reports a directory argument with the standard message and exits 2", async () => {
    // ADR-022: directory arguments are rejected by resolveInput. The loader
    // is responsible for catching that throw and presenting it consistently
    // — this is the test that pins the message format every command shares.
    await assert.rejects(
      () => loadWorkspace(EXAMPLES),
      (err: Error) => err instanceof ExitCalled && err.code === 2,
    );
    assert.equal(stderrLines.length, 1);
    assert.match(stderrLines[0]!, /^Error resolving path '/);
    assert.match(stderrLines[0]!, /directory arguments are not supported/);
  });

  it("includes the user-supplied path argument verbatim in the error message", async () => {
    // The previous inline sequences printed `Error resolving path: <msg>`
    // without the path itself, which made shell scripts harder to debug
    // when multiple commands chained. Pinning the new format here so a
    // future drive-by change cannot silently regress it.
    const bogus = "/definitely/does/not/exist.stm";
    await assert.rejects(
      () => loadWorkspace(bogus),
      (err: Error) => err instanceof ExitCalled && err.code === 2,
    );
    assert.ok(
      stderrLines.some((l) => l.includes(`'${bogus}'`)),
      `expected the bogus path to appear in the error message: ${stderrLines.join(" | ")}`,
    );
  });
});
