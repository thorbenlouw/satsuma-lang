/**
 * find.js — `satsuma find` command
 *
 * Searches the workspace for fields or blocks matching a tag or key.
 *
 * Usage:
 *   satsuma find --tag <token> [path]
 *   satsuma find --tag pii --in schema
 *   satsuma find --tag measure --json
 *
 * Flags:
 *   --tag <token>  search for a metadata tag_token or key_value_pair key
 *   --in <scope>   restrict to: schema | metric | fragment | all (default all)
 *   --compact      one match per line: file:row  block.field
 *   --json         structured JSON output
 */

import type { Command } from "commander";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex } from "../index-builder.js";
import { findBlockNode } from "../cst-query.js";
import type { WorkspaceIndex, ParsedFile, SyntaxNode } from "../types.js";

interface Match {
  blockType: string;
  block: string;
  field: string;
  tag: string;
  file: string;
  row: number;
}

export function register(program: Command): void {
  program
    .command("find [path]")
    .description("Find fields or blocks by metadata tag")
    .requiredOption("--tag <token>", "metadata tag or key to search for")
    .option("--in <scope>", "scope: schema|metric|fragment|all", "all")
    .option("--compact", "one match per line")
    .option("--json", "output JSON")
    .action(async (pathArg: string | undefined, opts: { tag: string; in?: string; compact?: boolean; json?: boolean }) => {
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

      const tag = opts.tag.toLowerCase();
      const scope = opts.in ?? "all";
      const matches = searchTag(index, parsedFiles, tag, scope);

      if (opts.json) {
        console.log(JSON.stringify(matches, null, 2));
      } else if (opts.compact) {
        for (const m of matches) {
          console.log(`${m.file}:${m.row + 1}  ${m.block}.${m.field}  [${m.tag}]`);
        }
      } else {
        printDefault(matches);
      }

      if (matches.length === 0) process.exit(1);
    });
}

// ── Search logic ──────────────────────────────────────────────────────────────

/**
 * Search for fields whose metadata contains the given tag/key.
 */
function searchTag(index: WorkspaceIndex, parsedFiles: ParsedFile[], tag: string, scope: string): Match[] {
  const matches: Match[] = [];
  const fileMap = new Map<string, ParsedFile>(parsedFiles.map((p) => [p.filePath, p]));

  const search = (blockType: string, blockName: string, blockEntry: { file: string; row: number }, bodyType: string) => {
    if (scope !== "all" && scope !== blockType) return;
    const parsed = fileMap.get(blockEntry.file);
    if (!parsed) return;

    const blockNode = findBlockNode(parsed.tree.rootNode, blockType + "_block", blockName);
    if (!blockNode) {
      // Fallback: use index fields (no tag info)
      return;
    }

    // Check schema-level metadata block for matching tags
    const meta = blockNode.namedChildren.find((c) => c.type === "metadata_block");
    if (meta) {
      const matched = findTagInMeta(meta, tag);
      if (matched) {
        matches.push({
          blockType,
          block: blockName,
          field: "(schema)",
          tag: matched,
          file: blockEntry.file,
          row: blockNode.startPosition.row,
        });
      }
    }

    const body = blockNode.namedChildren.find((c) => c.type === bodyType);
    if (!body) return;

    collectFieldMatches(body, blockType, blockName, blockEntry.file, tag, matches);
  };

  for (const [name, entry] of index.schemas) search("schema", name, entry, "schema_body");
  for (const [name, entry] of index.metrics) search("metric", name, entry, "metric_body");
  for (const [name, entry] of index.fragments) search("fragment", name, entry, "schema_body");

  return matches;
}

/**
 * Walk schema_body or metric_body and collect field_decls whose metadata
 * contains the given tag (case-insensitive prefix match).
 */
function collectFieldMatches(bodyNode: SyntaxNode, blockType: string, blockName: string, file: string, tag: string, acc: Match[]): void {
  for (const c of bodyNode.namedChildren) {
    if (c.type === "field_decl") {
      const nameNode = c.namedChildren.find((x) => x.type === "field_name");
      const meta = c.namedChildren.find((x) => x.type === "metadata_block");
      const inner = nameNode?.namedChildren[0];
      let fname = inner?.text ?? "";
      if (inner?.type === "backtick_name") fname = fname.slice(1, -1);

      if (meta) {
        const matched = findTagInMeta(meta, tag);
        if (matched) {
          acc.push({
            blockType,
            block: blockName,
            field: fname,
            tag: matched,
            file,
            row: c.startPosition.row,
          });
        }
      }
    } else if (c.type === "record_block" || c.type === "list_block") {
      const nested = c.namedChildren.find((x) => x.type === "schema_body");
      const lbl = c.namedChildren.find((x) => x.type === "block_label");
      const inner = lbl?.namedChildren[0];
      let lname = inner?.text ?? "";
      if (inner?.type === "quoted_name") lname = lname.slice(1, -1);
      const nestedName = `${blockName}.${lname}`;
      if (nested) collectFieldMatches(nested, blockType, nestedName, file, tag, acc);
    }
  }
}

/**
 * Check if a metadata_block contains a tag matching `tag`.
 * Returns the matched tag text or null.
 */
function findTagInMeta(metaNode: SyntaxNode, tag: string): string | null {
  for (const c of metaNode.namedChildren) {
    if (c.type === "tag_token" && c.text.toLowerCase() === tag) {
      return c.text;
    }
    if (c.type === "key_value_pair") {
      const key = c.namedChildren.find((x) => x.type === "kv_key");
      if (key && key.text.toLowerCase() === tag) return key.text;
    }
    // enum_body or slice_body — check identifiers inside
    if (c.type === "enum_body" || c.type === "slice_body") {
      for (const id of c.namedChildren) {
        if (id.type === "identifier" && id.text.toLowerCase() === tag) return id.text;
      }
    }
  }
  return null;
}

// ── Default formatter ─────────────────────────────────────────────────────────

function printDefault(matches: Match[]): void {
  if (matches.length === 0) {
    console.log("No matches found.");
    return;
  }

  // Group by block
  const byBlock = new Map<string, { blockType: string; block: string; file: string; fields: Match[] }>();
  for (const m of matches) {
    const key = `${m.blockType}:${m.block}`;
    if (!byBlock.has(key)) byBlock.set(key, { blockType: m.blockType, block: m.block, file: m.file, fields: [] });
    byBlock.get(key)!.fields.push(m);
  }

  for (const { blockType, block, file, fields } of byBlock.values()) {
    console.log(`${blockType} ${block}  (${file})`);
    for (const f of fields) {
      console.log(`  ${f.field.padEnd(24)}[${f.tag}]  line ${f.row + 1}`);
    }
    console.log();
  }
}
