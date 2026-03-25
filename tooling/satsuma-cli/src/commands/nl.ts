/**
 * nl.ts — `satsuma nl <scope>` command
 *
 * Extracts all NL content (notes, transforms, comments) within a scope.
 * Scope: schema <name>, mapping <name>, field <schema.field>, or all.
 *
 * Flags:
 *   --kind <type>  filter to: note, warning, question, or transform
 *   --json         structured JSON output
 */

import type { Command } from "commander";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { extractNLContent } from "../nl-extract.js";
import type { NLItem } from "../nl-extract.js";
import { findBlockNode, getBlockName } from "../cst-query.js";
import type { SyntaxNode, WorkspaceIndex, ParsedFile, FieldDecl } from "../types.js";

interface NLItemWithFile extends NLItem {
  file: string;
}

export function register(program: Command): void {
  program
    .command("nl <scope> [path]")
    .description("Extract NL content (notes, transforms, comments) from a scope")
    .option("--kind <type>", "filter by kind: note, warning, question, transform")
    .option("--json", "structured JSON output")
    .addHelpText("after", `
Scope formats:
  <block-name>     NL in a schema, mapping, metric, or transform by name
  <schema.field>   NL on a specific field and arrows referencing it
  all              NL across the entire workspace

Examples:
  satsuma nl 'demographics to mart'          # NL in a mapping
  satsuma nl hub_customer                    # NL in a schema
  satsuma nl mart_customer_360.email         # NL on a field
  satsuma nl all ./workspace                 # all NL in a directory
  satsuma nl all --kind warning              # only //! warnings
  satsuma nl hub_customer --json             # structured output`)
    .action(async (scope: string, pathArg: string | undefined, opts: { kind?: string; json?: boolean }) => {
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

      let items: NLItemWithFile[];
      if (scope === "all") {
        items = extractFromAll(parsedFiles);
      } else if (scope.includes(".")) {
        items = extractFromField(scope, parsedFiles, index);
      } else {
        items = extractFromBlock(scope, parsedFiles, index);
      }

      if (opts.kind) {
        items = items.filter((i) => i.kind === opts.kind);
      }

      if (opts.json) {
        console.log(JSON.stringify(items, null, 2));
        return;
      }

      if (items.length === 0) {
        console.log(`No NL content found for scope '${scope}'.`);
        return;
      }

      printDefault(items);
    });
}

function extractFromAll(parsedFiles: ParsedFile[]): NLItemWithFile[] {
  const items: NLItemWithFile[] = [];
  for (const { filePath, tree } of parsedFiles) {
    for (const item of extractNLContent(tree.rootNode)) {
      items.push({ ...item, file: filePath });
    }
  }
  return items;
}

function extractFromBlock(blockName: string, parsedFiles: ParsedFile[], index: WorkspaceIndex): NLItemWithFile[] {
  // Check if it's a schema, mapping, metric, or transform (resolving namespace-qualified keys)
  const schemaResolved = resolveIndexKey(blockName, index.schemas);
  const mappingResolved = resolveIndexKey(blockName, index.mappings);
  const metricResolved = resolveIndexKey(blockName, index.metrics);
  const transformResolved = resolveIndexKey(blockName, index.transforms);

  if (!schemaResolved && !mappingResolved && !metricResolved && !transformResolved) {
    console.error(`'${blockName}' not found as a schema, mapping, metric, or transform.`);
    const allNames = [
      ...index.schemas.keys(),
      ...index.mappings.keys(),
      ...index.metrics.keys(),
      ...index.transforms.keys(),
    ];
    const close = allNames.find(
      (k) => k.toLowerCase() === blockName.toLowerCase(),
    );
    if (close) console.error(`Did you mean '${close}'?`);
    process.exit(1);
  }

  // Collect NL content from ALL matching blocks (schema, mapping, metric, transform)
  // to handle ambiguous names where a schema and mapping share a name
  const items: NLItemWithFile[] = [];
  const matches: Array<{ key: string; entry: { file: string }; blockType: string }> = [];
  if (schemaResolved) matches.push({ key: schemaResolved.key, entry: schemaResolved.entry, blockType: "schema_block" });
  if (mappingResolved) matches.push({ key: mappingResolved.key, entry: mappingResolved.entry, blockType: "mapping_block" });
  if (metricResolved) matches.push({ key: metricResolved.key, entry: metricResolved.entry, blockType: "metric_block" });
  if (transformResolved) matches.push({ key: transformResolved.key, entry: transformResolved.entry, blockType: "transform_block" });

  for (const { key, entry, blockType } of matches) {
    const parsed = parsedFiles.find((p) => p.filePath === entry.file);
    const node = parsed ? findBlockNode(parsed.tree.rootNode, blockType, key) : null;
    if (node) {
      for (const item of extractNLContent(node, blockName)) {
        items.push({ ...item, file: entry.file });
      }
    }
  }

  return items;
}

function extractFromField(fieldRef: string, parsedFiles: ParsedFile[], index: WorkspaceIndex): NLItemWithFile[] {
  const dot = fieldRef.indexOf(".");
  const schemaName = fieldRef.slice(0, dot);
  const fieldPath = fieldRef.slice(dot + 1);
  // Support nested paths like schema.record.nested.field
  const pathSegments = fieldPath.split(".");
  const leafName = pathSegments[pathSegments.length - 1]!;

  const resolvedSchema = resolveIndexKey(schemaName, index.schemas);
  if (!resolvedSchema) {
    console.error(`Schema '${schemaName}' not found.`);
    process.exit(1);
  }

  const schema = resolvedSchema.entry;
  // For multi-segment paths, require exact path match; for single-segment, use flat search
  const fieldExists = pathSegments.length > 1
    ? schemaHasFieldByPath(schema.fields, pathSegments)
    : schemaHasField(schema.fields, leafName);
  if (!fieldExists) {
    console.error(
      `Field '${fieldPath}' not found in schema '${schemaName}'.`,
    );
    process.exit(1);
  }

  const items: NLItemWithFile[] = [];
  const parsed = parsedFiles.find((p) => p.filePath === schema.file);
  const schemaNode = parsed ? findBlockNode(parsed.tree.rootNode, "schema_block", resolvedSchema.key) : null;
  const body = schemaNode?.namedChildren.find((c) => c.type === "schema_body");
  if (body) {
    // Navigate to the nested body for intermediate path segments, then find the leaf field
    const targetBody = navigateToNestedBody(body, pathSegments.slice(0, -1));
    for (const fieldDecl of findFieldDecls(targetBody, leafName)) {
      for (const item of extractNLContent(fieldDecl, leafName)) {
        items.push({ ...item, file: schema.file });
      }
    }
  }

  // Also extract NL from arrows targeting/sourcing this field in mappings
  // Only include arrows from mappings whose source or target schemas include the resolved schema
  const resolvedSchemaKey = resolvedSchema.key;
  for (const [, mapping] of index.mappings) {
    const mappingSources = mapping.sources ?? [];
    const mappingTargets = mapping.targets ?? [];
    const schemaIsRelevant =
      mappingSources.includes(resolvedSchemaKey) ||
      mappingTargets.includes(resolvedSchemaKey);
    if (!schemaIsRelevant) continue;

    const mappingParsed = parsedFiles.find((p) => p.filePath === mapping.file);
    if (!mappingParsed) continue;

    const mappingKey = mapping.namespace
      ? `${mapping.namespace}::${mapping.name}`
      : (mapping.name ?? "");
    const mappingNode = findBlockNode(mappingParsed.tree.rootNode, "mapping_block", mappingKey);
    if (!mappingNode) continue;

    const mBody = mappingNode.namedChildren.find(
      (c) => c.type === "mapping_body",
    );
    if (!mBody) continue;

    const bodyChildren = mBody.namedChildren;
    for (let idx = 0; idx < bodyChildren.length; idx++) {
      const arrow = bodyChildren[idx]!;
      if (arrow.type !== "map_arrow" && arrow.type !== "computed_arrow")
        continue;
      const src = arrow.namedChildren.find((c) => c.type === "src_path");
      const tgt = arrow.namedChildren.find((c) => c.type === "tgt_path");
      const srcText = src?.namedChildren[0]?.text ?? null;
      const tgtText = tgt?.namedChildren[0]?.text ?? null;
      if (srcText !== leafName && tgtText !== leafName) continue;

      const parentName = getBlockName(mappingNode) ?? "?";

      // Include warning/question comments immediately preceding this arrow
      for (let ci = idx - 1; ci >= 0; ci--) {
        const prev = bodyChildren[ci]!;
        if (prev.type === "warning_comment" || prev.type === "question_comment") {
          for (const item of extractNLContent(prev, parentName)) {
            items.push({ ...item, file: mapping.file });
          }
        } else {
          break; // stop at first non-comment
        }
      }

      for (const item of extractNLContent(arrow, parentName)) {
        items.push({ ...item, file: mapping.file });
      }
    }
  }

  return items;
}

function getFieldDeclName(fieldDecl: SyntaxNode): string | null {
  const nameNode = fieldDecl.namedChildren.find(
    (c) => c.type === "field_name",
  );
  const inner = nameNode?.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "backtick_name") return inner.text.slice(1, -1);
  return inner.text;
}

function schemaHasField(fields: FieldDecl[], fieldName: string): boolean {
  for (const field of fields) {
    if (field.name === fieldName) return true;
    if (field.children && schemaHasField(field.children, fieldName)) return true;
  }
  return false;
}

function schemaHasFieldByPath(fields: FieldDecl[], segments: string[]): boolean {
  if (segments.length === 0) return false;
  const [head, ...rest] = segments;
  for (const field of fields) {
    if (field.name === head) {
      if (rest.length === 0) return true;
      if (field.children) return schemaHasFieldByPath(field.children, rest);
    }
  }
  return false;
}

function navigateToNestedBody(body: SyntaxNode, intermediateSegments: string[]): SyntaxNode {
  let current = body;
  for (const seg of intermediateSegments) {
    let found = false;
    for (const c of current.namedChildren) {
      if (c.type === "field_decl") {
        if (getFieldDeclName(c) === seg) {
          const nested = c.namedChildren.find((x) => x.type === "schema_body");
          if (nested) {
            current = nested;
            found = true;
            break;
          }
        }
      }
    }
    if (!found) break;
  }
  return current;
}

function findFieldDecls(bodyNode: SyntaxNode, fieldName: string, acc: SyntaxNode[] = []): SyntaxNode[] {
  for (const child of bodyNode.namedChildren) {
    if (child.type === "field_decl") {
      if (getFieldDeclName(child) === fieldName) {
        acc.push(child);
        continue;
      }
      // Recurse into nested record/list_of fields
      const nestedBody = child.namedChildren.find((c) => c.type === "schema_body");
      if (nestedBody) findFieldDecls(nestedBody, fieldName, acc);
    }
  }
  return acc;
}

function printDefault(items: NLItemWithFile[]): void {
  for (const item of items) {
    const prefix = item.kind === "warning" ? "//! " :
      item.kind === "question" ? "//? " :
        item.kind === "transform" ? "[transform] " :
          "[note] ";
    const parent = item.parent ? ` (${item.parent})` : "";
    console.log(`${prefix}${item.text}${parent}`);
  }
}
