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
import { resolveScopedEntityRef } from "../index-builder.js";
import type { WorkspaceIndex, ParsedFile, SyntaxNode } from "../types.js";

interface Match {
  blockType: string;
  block: string;
  field: string;
  tag: string;
  fieldType?: string | null;
  metadata?: string[];
  file: string;
  line: number;
}

export function register(program: Command): void {
  program
    .command("find [path]")
    .description("Find fields or blocks by metadata tag")
    .requiredOption("--tag <token>", "metadata tag or key to search for")
    .option("--in <scope>", "scope: schema|metric|fragment|all", "all")
    .option("--compact", "one match per line")
    .option("--json", "output JSON")
    .addHelpText("after", `
Searches all field metadata for the given tag token or key-value key.
Common tags: pk, required, unique, pii, encrypt, indexed, measure, ref, enum.

JSON shape (--json): array of match objects
  [{
    "blockType": "schema" | "metric" | "fragment",
    "block":     str,   # block name
    "field":     str,   # field name
    "tag":       str,   # the matched tag token
    "fieldType": str | null,
    "metadata":  [str, ...],
    "file":      str,
    "line":      int
  }, ...]

Examples:
  satsuma find --tag pii                     # all PII-tagged fields
  satsuma find --tag measure --in metric     # measure fields in metrics only
  satsuma find --tag ref --json              # all foreign key refs as JSON
  satsuma find --tag enum --compact          # compact one-per-line output`)
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
      const validScopes = ["all", "schema", "metric", "fragment"];
      if (!validScopes.includes(scope)) {
        console.error(`Invalid scope '${scope}'. Valid scopes: ${validScopes.join(", ")}`);
        process.exit(1);
      }
      const matches = searchTag(index, parsedFiles, tag, scope);

      if (opts.json) {
        console.log(JSON.stringify(matches, null, 2));
      } else if (opts.compact) {
        for (const m of matches) {
          console.log(`${m.file}:${m.line}  ${m.block}.${m.field}  [${m.tag}]`);
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

  const search = (blockType: string, blockName: string, blockEntry: { file: string; row: number; line?: number }, bodyType: string) => {
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
        const allTags = collectAllTags(meta);
        matches.push({
          blockType,
          block: blockName,
          field: "(schema)",
          tag: matched,
          fieldType: null,
          metadata: allTags.length > 0 ? allTags : undefined,
          file: blockEntry.file,
          line: blockNode.startPosition.row + 1,
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

  // For schemas with fragment spreads, also search spread fragment fields
  if (scope === "all" || scope === "schema") {
    for (const [schemaName, schema] of index.schemas) {
      if (!schema.hasSpreads || !schema.spreads?.length) continue;
      collectSpreadFieldMatches(schemaName, schema, index, fileMap, tag, matches);
    }
  }

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
      const typeNode = c.namedChildren.find((x) => x.type === "type_expr");
      const meta = c.namedChildren.find((x) => x.type === "metadata_block");
      const nested = c.namedChildren.find((x) => x.type === "schema_body");
      const inner = nameNode?.namedChildren[0];
      let fname = inner?.text ?? "";
      if (inner?.type === "backtick_name") fname = fname.slice(1, -1);

      if (meta) {
        const matched = findTagInMeta(meta, tag);
        if (matched) {
          const allTags = collectAllTags(meta);
          const isListOf = c.text.trimStart().replace(/^`[^`]*`\s*/, "").replace(/^\S+\s*/, "").startsWith("list_of");
          let fieldType: string | undefined;
          if (isListOf) {
            fieldType = typeNode ? `list_of ${typeNode.text}` : "list_of record";
          } else {
            fieldType = typeNode?.text;
          }
          acc.push({
            blockType,
            block: blockName,
            field: fname,
            tag: matched,
            fieldType,
            metadata: allTags.length > 0 ? allTags : undefined,
            file,
            line: c.startPosition.row + 1,
          });
        }
      }
      // Recurse into nested record/list_of fields
      if (nested) {
        const nestedName = `${blockName}.${fname}`;
        collectFieldMatches(nested, blockType, nestedName, file, tag, acc);
      }
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
    if (c.type === "tag_with_value") {
      const key = c.namedChildren[0];
      if (key && key.text.toLowerCase() === tag) return key.text;
    }
    // note_tag — matches --tag note
    if (c.type === "note_tag" && tag === "note") {
      return "note";
    }
    // enum_body or slice_body — check identifiers inside
    if (c.type === "enum_body" || c.type === "slice_body") {
      if (c.type === "enum_body" && tag === "enum") return "enum";
      if (c.type === "slice_body" && tag === "slice") return "slice";
      for (const id of c.namedChildren) {
        if (id.type === "identifier" && id.text.toLowerCase() === tag) return id.text;
      }
    }
  }
  return null;
}

function collectAllTags(metaNode: SyntaxNode): string[] {
  const tags: string[] = [];
  for (const c of metaNode.namedChildren) {
    if (c.type === "tag_token") tags.push(c.text);
    else if (c.type === "tag_with_value") {
      const key = c.namedChildren[0]; // identifier
      const val = c.namedChildren[1]; // value_text
      const valueText = renderMetadataValue(val);
      tags.push(valueText ? `${key?.text} ${valueText}` : (key?.text ?? ""));
    } else if (c.type === "note_tag") {
      const strNode = c.namedChildren.find((x) => x.type === "nl_string" || x.type === "multiline_string");
      tags.push(strNode ? `note ${strNode.text}` : "note");
    }
    else if (c.type === "enum_body") tags.push("enum {...}");
    else if (c.type === "slice_body") tags.push("slice {...}");
  }
  return tags;
}

/**
 * Render metadata values for `find --json` using logical values rather than
 * source syntax, so quoted strings do not keep their delimiters.
 */
function renderMetadataValue(valueNode: SyntaxNode | undefined): string {
  if (!valueNode) return "";

  if (valueNode.type === "nl_string" || valueNode.type === "backtick_name") {
    return valueNode.text.slice(1, -1);
  }

  const nestedValue = valueNode.namedChildren.find(
    (child) => child.type === "nl_string" || child.type === "backtick_name",
  );
  if (nestedValue) {
    return renderMetadataValue(nestedValue);
  }

  const text = valueNode.text;
  if (
    text.length >= 2 &&
    ((text.startsWith("\"") && text.endsWith("\"")) ||
      (text.startsWith("`") && text.endsWith("`")))
  ) {
    return text.slice(1, -1);
  }

  return text;
}

/**
 * For a schema with fragment spreads, search each spread fragment's CST for
 * tagged fields and report them under the consuming schema.
 */
function collectSpreadFieldMatches(
  schemaName: string,
  schema: { spreads?: string[]; namespace?: string | null; file: string; row: number },
  index: WorkspaceIndex,
  fileMap: Map<string, ParsedFile>,
  tag: string,
  acc: Match[],
): void {
  const visited = new Set<string>();
  const queue = [...(schema.spreads ?? [])];
  const ns = schema.namespace ?? null;

  // Collect already-matched field names to avoid duplicates
  const existing = new Set(
    acc.filter((m) => m.blockType === "schema" && m.block === schemaName).map((m) => m.field),
  );

  while (queue.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Safe: queue.length > 0 checked above
    const spreadRef = queue.pop()!;
    const resolvedKey = resolveScopedEntityRef(spreadRef, ns, index.fragments);
    if (!resolvedKey || visited.has(resolvedKey)) continue;
    visited.add(resolvedKey);

    const fragment = index.fragments.get(resolvedKey);
    if (!fragment) continue;

    const parsed = fileMap.get(fragment.file);
    if (!parsed) continue;

    const fragNode = findBlockNode(parsed.tree.rootNode, "fragment_block", resolvedKey);
    if (!fragNode) continue;

    const body = fragNode.namedChildren.find((c) => c.type === "schema_body");
    if (!body) continue;

    // Search the fragment's body for matching fields, but report under the consuming schema
    // Use the consuming schema's file and row, not the fragment's
    const fragMatches: Match[] = [];
    collectFieldMatches(body, "schema", schemaName, fragment.file, tag, fragMatches);
    for (const m of fragMatches) {
      if (!existing.has(m.field)) {
        existing.add(m.field);
        acc.push({ ...m, file: schema.file, line: schema.row + 1 });
      }
    }

    // Recurse into transitive spreads
    if (fragment.hasSpreads && fragment.spreads?.length) {
      for (const s of fragment.spreads) queue.push(s);
    }
  }
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Safe: key initialized on previous line
    byBlock.get(key)!.fields.push(m);
  }

  for (const { blockType, block, file, fields } of byBlock.values()) {
    console.log(`${blockType} ${block}  (${file})`);
    for (const f of fields) {
      const typeStr = f.fieldType ? `  ${f.fieldType}` : "";
      console.log(`  ${f.field.padEnd(24)}${typeStr.padEnd(16)}[${f.tag}]  line ${f.line}`);
    }
    console.log();
  }
}
