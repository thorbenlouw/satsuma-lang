/**
 * mapping.js — `stm mapping <name>` command
 *
 * Looks up a mapping by name and renders it. Output modes:
 *   default      — reconstructed mapping block with arrows and transforms
 *   --compact    — omit transform bodies and note blocks
 *   --arrows-only — table of src → tgt (one per line)
 *   --json       — full structured JSON output
 *
 * Exits 1 if the mapping name is not found.
 */

import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { findBlockNode } from "../cst-query.js";

/** @param {import('commander').Command} program */
export function register(program) {
  program
    .command("mapping <name> [path]")
    .description("Show a mapping definition")
    .option("--compact", "omit transform bodies and notes")
    .option("--arrows-only", "print src → tgt table")
    .option("--json", "output JSON")
    .action(async (name, pathArg, opts) => {
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

      const resolved = resolveIndexKey(name, index.mappings);
      if (!resolved) {
        const keys = [...index.mappings.keys()];
        const close = keys.find((k) => k.toLowerCase() === name.toLowerCase());
        if (close) {
          console.error(`Mapping '${name}' not found. Did you mean '${close}'?`);
        } else {
          console.error(`Mapping '${name}' not found.`);
          if (keys.length > 0) console.error(`Available: ${keys.join(", ")}`);
        }
        process.exit(1);
      }
      const entry = resolved.entry;

      const parsed = parsedFiles.find((p) => p.filePath === entry.file);
      const mappingNode = parsed ? findBlockNode(parsed.tree.rootNode, "mapping_block", resolved.key) : null;

      if (opts.json) {
        printJson(entry, mappingNode);
      } else if (opts.arrowsOnly) {
        printArrowsOnly(entry, mappingNode);
      } else {
        printDefault(entry, mappingNode, opts.compact);
      }
    });
}

// ── CST helpers ───────────────────────────────────────────────────────────────

/** Extract text from a path node (_path_expr variants). */
function pathText(pathNode) {
  if (!pathNode) return "?";
  // The node's text is the full path text including :: separators etc.
  return pathNode.text;
}

/** Collect arrows from mapping_body as {kind, src, tgt, hasBody} objects. */
function collectArrows(bodyNode) {
  if (!bodyNode) return [];
  const arrows = [];
  for (const c of bodyNode.namedChildren) {
    if (c.type === "map_arrow") {
      const src = c.namedChildren.find((x) => x.type === "src_path");
      const tgt = c.namedChildren.find((x) => x.type === "tgt_path");
      const hasBody = c.namedChildren.some((x) => x.type === "pipe_chain");
      arrows.push({ kind: "map", src: pathText(src), tgt: pathText(tgt), hasBody, node: c });
    } else if (c.type === "computed_arrow") {
      const tgt = c.namedChildren.find((x) => x.type === "tgt_path");
      const hasBody = c.namedChildren.some((x) => x.type === "pipe_chain");
      arrows.push({ kind: "computed", src: null, tgt: pathText(tgt), hasBody, node: c });
    } else if (c.type === "nested_arrow") {
      const src = c.namedChildren.find((x) => x.type === "src_path");
      const tgt = c.namedChildren.find((x) => x.type === "tgt_path");
      arrows.push({ kind: "nested", src: pathText(src), tgt: pathText(tgt), hasBody: true, node: c });
    }
  }
  return arrows;
}

// ── Formatters ────────────────────────────────────────────────────────────────

function printJson(entry, mappingNode) {
  const body = mappingNode?.namedChildren.find((c) => c.type === "mapping_body");
  const arrows = collectArrows(body).map(({ kind, src, tgt, hasBody }) => ({
    kind,
    src,
    tgt,
    hasTransform: hasBody,
  }));
  console.log(
    JSON.stringify(
      {
        name: entry.name,
        sources: entry.sources,
        targets: entry.targets,
        arrowCount: entry.arrowCount,
        arrows,
        file: entry.file,
        row: entry.row,
      },
      null,
      2,
    ),
  );
}

function printArrowsOnly(entry, mappingNode) {
  const body = mappingNode?.namedChildren.find((c) => c.type === "mapping_body");
  if (body) {
    for (const { src, tgt } of collectArrows(body)) {
      const srcStr = src ?? "(computed)";
      console.log(`${srcStr.padEnd(30)} -> ${tgt}`);
    }
  } else {
    // Fallback
    console.log(`${entry.sources.join(", ")} -> ${entry.targets.join(", ")}`);
  }
}

function printDefault(entry, mappingNode, compact) {
  const nameStr = entry.name ? ` '${entry.name}'` : "";
  console.log(`mapping${nameStr} {`);

  const body = mappingNode?.namedChildren.find((c) => c.type === "mapping_body");
  if (body) {
    // source / target blocks
    const srcBlock = body.namedChildren.find((c) => c.type === "source_block");
    const tgtBlock = body.namedChildren.find((c) => c.type === "target_block");
    if (srcBlock) console.log(`  source { ${srcBlock.namedChildren.map((c) => c.text).join(", ")} }`);
    if (tgtBlock) console.log(`  target { ${tgtBlock.namedChildren.map((c) => c.text).join(", ")} }`);

    // Arrows and notes
    for (const c of body.namedChildren) {
      if (c.type === "note_block") {
        if (!compact) console.log(`  note { ... }`);
        continue;
      }
      if (c.type === "source_block" || c.type === "target_block") continue;

      if (c.type === "map_arrow" || c.type === "nested_arrow") {
        const src = c.namedChildren.find((x) => x.type === "src_path");
        const tgt = c.namedChildren.find((x) => x.type === "tgt_path");
        const pipeChain = c.namedChildren.find((x) => x.type === "pipe_chain");
        const srcStr = pathText(src);
        const tgtStr = pathText(tgt);
        if (compact || !pipeChain) {
          console.log(`  ${srcStr} -> ${tgtStr}`);
        } else {
          console.log(`  ${srcStr} -> ${tgtStr} { ${pipeChain.text} }`);
        }
      } else if (c.type === "computed_arrow") {
        const tgt = c.namedChildren.find((x) => x.type === "tgt_path");
        const pipeChain = c.namedChildren.find((x) => x.type === "pipe_chain");
        const tgtStr = pathText(tgt);
        if (compact || !pipeChain) {
          console.log(`  -> ${tgtStr}`);
        } else {
          console.log(`  -> ${tgtStr} { ${pipeChain.text} }`);
        }
      }
    }
  } else {
    // Fallback from index
    console.log(`  source { ${entry.sources.join(", ")} }`);
    console.log(`  target { ${entry.targets.join(", ")} }`);
    console.log(`  // ${entry.arrowCount} arrows`);
  }

  console.log("}");
}
