/**
 * load-workspace.ts — One-call workspace loader for CLI commands
 *
 * Owns the standard "resolve a path argument → parse files → build the
 * extracted workspace" pipeline that almost every CLI command needs. Keeping
 * it in one place gives us:
 *
 *   • a single, consistent error contract (resolve failures, empty
 *     workspaces, and unreadable files all report the same way across
 *     commands), and
 *   • a single place to evolve when sl-67k7 (R7, typed errors) lands.
 *
 * Out of scope: per-file parse-error tolerance (`fmt` needs that), two-path
 * loads with `followImports: false` (`diff`), and JSON-formatted resolve
 * errors (`validate --json`). Those three commands continue to call
 * `resolveInput` / `loadFiles` / `buildIndex` directly because their
 * error semantics are genuinely different — wrapping them here would just
 * push the complexity into option flags.
 */

import { resolveInput } from "./workspace.js";
import { parseFile } from "./parser.js";
import { loadFiles } from "./errors.js";
import { CommandError, EXIT_PARSE_ERROR } from "./command-runner.js";
import { buildIndex } from "./index-builder.js";
import type { ExtractedWorkspace, ParsedFile } from "./types.js";

/** Result of {@link loadWorkspace}: parsed files plus the assembled index. */
export interface LoadedWorkspace {
  /** All parsed files in the workspace, in canonical (sorted) order. Commands
   *  that need to walk the raw CST keep this around; commands that only need
   *  the extracted records ignore it. */
  files: ParsedFile[];
  /** The fully built `ExtractedWorkspace` — schemas, mappings, arrows, etc. */
  index: ExtractedWorkspace;
}

/** Options forwarded to {@link resolveInput}. */
export interface LoadWorkspaceOptions {
  /** Whether to follow `import` declarations transitively. Defaults to true.
   *  Set to false for commands like `diff` that compare two single files. */
  followImports?: boolean;
}

/**
 * Resolve a path argument and load the full workspace, throwing a
 * {@link CommandError} on the common failure modes:
 *
 *   • `resolveInput` throws (bad path, directory argument, …) →
 *     `CommandError("Error resolving path '<arg>': <message>", EXIT_PARSE_ERROR)`.
 *   • A file cannot be read → {@link loadFiles} prints per-file warnings to
 *     stderr and throws an empty-message `CommandError(EXIT_PARSE_ERROR)`.
 *
 * Both branches surface to the user via {@link runCommand}, which is the
 * single place in the CLI that calls `process.exit`.
 *
 * Files with parse errors are kept (a warning is printed) so commands can
 * still operate on partially-broken workspaces; this matches the long-
 * standing per-command behaviour and is what {@link loadFiles} already does.
 *
 * `resolveInput` always returns at least the entry file (it seeds the
 * import-graph traversal with the entry path itself), so there is no
 * "empty workspace" branch to handle here.
 */
export async function loadWorkspace(
  pathArg: string | undefined,
  options: LoadWorkspaceOptions = {},
): Promise<LoadedWorkspace> {
  const root = pathArg ?? ".";

  let filePaths: string[];
  try {
    filePaths = await resolveInput(root, { followImports: options.followImports ?? true });
  } catch (err: unknown) {
    throw new CommandError(
      `Error resolving path '${root}': ${(err as Error).message}`,
      EXIT_PARSE_ERROR,
    );
  }

  const files = loadFiles(filePaths, parseFile);
  const index = buildIndex(files);
  return { files, index };
}
