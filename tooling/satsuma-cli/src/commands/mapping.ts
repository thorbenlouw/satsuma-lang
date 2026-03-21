/**
 * mapping.ts — `satsuma mapping <name>` command
 *
 * Looks up a mapping by name and renders it. Output modes:
 *   default      — reconstructed mapping block with arrows and transforms
 *   --compact    — omit transform bodies and note blocks
 *   --arrows-only — table of src → tgt (one per line)
 *   --json       — full structured JSON output
 *
 * Exits 1 if the mapping name is not found.
 */

import type { Command } from "commander";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { findBlockNode } from "../cst-query.js";
import { extractMetadata } from "../meta-extract.js";
import { classifyTransform } from "../classify.js";
import type { SyntaxNode, MappingRecord } from "../types.js";

export function register(program: Command): void {
  program
    .command("mapping <name> [path]")
    .description("Show a mapping definition")
    .option("--compact", "omit transform bodies and notes")
    .option("--arrows-only", "print src → tgt table")
    .option("--json", "output JSON")
    .action(async (name: string, pathArg: string | undefined, opts: { compact?: boolean; arrowsOnly?: boolean; json?: boolean }) => {
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

/** Extract text from a path node (_path_expr variants), stripping backticks. */
function pathText(pathNode: SyntaxNode | undefined): string {
  if (!pathNode) return "?";
  const inner = pathNode.namedChildren[0];
  if (inner?.type === "backtick_path" || inner?.type === "backtick_name") {
    return inner.text.slice(1, -1);
  }
  return pathNode.text;
}

interface ArrowInfo {
  kind: string;
  src: string | null;
  tgt: string;
  hasBody: boolean;
  metaNode: SyntaxNode | undefined;
  node: SyntaxNode;
}

/** Collect arrows from mapping_body as {kind, src, tgt, hasBody} objects. */
function collectArrows(bodyNode: SyntaxNode | undefined): ArrowInfo[] {
  if (!bodyNode) return [];
  const arrows: ArrowInfo[] = [];
  for (const c of bodyNode.namedChildren) {
    if (c.type === "map_arrow") {
      const src = c.namedChildren.find((x) => x.type === "src_path");
      const tgt = c.namedChildren.find((x) => x.type === "tgt_path");
      const hasBody = c.namedChildren.some((x) => x.type === "pipe_chain");
      const meta = c.namedChildren.find((x) => x.type === "metadata_block");
      arrows.push({ kind: "map", src: pathText(src), tgt: pathText(tgt), hasBody, metaNode: meta, node: c });
    } else if (c.type === "computed_arrow") {
      const tgt = c.namedChildren.find((x) => x.type === "tgt_path");
      const hasBody = c.namedChildren.some((x) => x.type === "pipe_chain");
      const meta = c.namedChildren.find((x) => x.type === "metadata_block");
      arrows.push({ kind: "computed", src: null, tgt: pathText(tgt), hasBody, metaNode: meta, node: c });
    } else if (c.type === "nested_arrow") {
      const src = c.namedChildren.find((x) => x.type === "src_path");
      const tgt = c.namedChildren.find((x) => x.type === "tgt_path");
      const meta = c.namedChildren.find((x) => x.type === "metadata_block");
      arrows.push({ kind: "nested", src: pathText(src), tgt: pathText(tgt), hasBody: true, metaNode: meta, node: c });
    }
  }
  return arrows;
}

// ── Formatters ────────────────────────────────────────────────────────────────

function printJson(entry: MappingRecord, mappingNode: SyntaxNode | null): void {
  const body = mappingNode?.namedChildren.find((c) => c.type === "mapping_body");
  const metaNode = mappingNode?.namedChildren.find((c) => c.type === "metadata_block");
  const metadata = extractMetadata(metaNode);
  const arrows = collectArrows(body ?? undefined).map(({ kind, src, tgt, hasBody, metaNode: arrowMeta, node: arrowNode }) => {
    const pipeChain = arrowNode.namedChildren.find((x) => x.type === "pipe_chain");
    const pipeSteps = pipeChain ? [...pipeChain.namedChildren].filter((x) => x.type === "pipe_step") : [];
    const classification = classifyTransform(pipeSteps.length > 0 ? pipeSteps : null);
    const arrowObj: Record<string, unknown> = { kind, src, tgt, hasTransform: hasBody, classification };
    if (hasBody) {
      if (pipeChain) arrowObj.transform = pipeChain.text;
    }
    const arrowMetadata = extractMetadata(arrowMeta);
    if (arrowMetadata.length > 0) arrowObj.metadata = arrowMetadata;
    return arrowObj;
  });
  console.log(
    JSON.stringify(
      {
        name: entry.name,
        sources: entry.sources,
        targets: entry.targets,
        arrowCount: entry.arrowCount,
        ...(metadata.length > 0 ? { metadata } : {}),
        arrows,
        file: entry.file,
        row: entry.row,
      },
      null,
      2,
    ),
  );
}

function printArrowsOnly(entry: MappingRecord, mappingNode: SyntaxNode | null): void {
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

function printDefault(entry: MappingRecord, mappingNode: SyntaxNode | null, compact: boolean | undefined): void {
  const nameStr = entry.name ? ` '${entry.name}'` : "";
  const metaNode = mappingNode?.namedChildren.find((c) => c.type === "metadata_block");
  const metaText = metaNode && !compact ? ` ${metaNode.text}` : "";
  console.log(`mapping${nameStr}${metaText} {`);

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
        const arrowMeta = c.namedChildren.find((x) => x.type === "metadata_block");
        const srcStr = pathText(src);
        const tgtStr = pathText(tgt);
        const metaSuffix = arrowMeta && !compact ? ` ${arrowMeta.text}` : "";
        if (compact || !pipeChain) {
          console.log(`  ${srcStr} -> ${tgtStr}${metaSuffix}`);
        } else {
          console.log(`  ${srcStr} -> ${tgtStr}${metaSuffix} { ${pipeChain.text} }`);
        }
      } else if (c.type === "computed_arrow") {
        const tgt = c.namedChildren.find((x) => x.type === "tgt_path");
        const pipeChain = c.namedChildren.find((x) => x.type === "pipe_chain");
        const arrowMeta = c.namedChildren.find((x) => x.type === "metadata_block");
        const tgtStr = pathText(tgt);
        const metaSuffix = arrowMeta && !compact ? ` ${arrowMeta.text}` : "";
        if (compact || !pipeChain) {
          console.log(`  -> ${tgtStr}${metaSuffix}`);
        } else {
          console.log(`  -> ${tgtStr}${metaSuffix} { ${pipeChain.text} }`);
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
