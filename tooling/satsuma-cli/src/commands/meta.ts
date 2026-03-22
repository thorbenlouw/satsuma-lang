/**
 * meta.ts — `satsuma meta <scope>` command
 *
 * Extracts metadata entries for a block or field.
 * Scope: schema <name>, field <schema.field>, mapping <name>, metric <name>.
 *
 * Flags:
 *   --tags-only   just tag tokens, one per line
 *   --json        structured metadata object
 */

import type { Command } from "commander";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { extractMetadata } from "../meta-extract.js";
import type { MetaEntry } from "../meta-extract.js";
import { findBlockNode } from "../cst-query.js";
import type { SyntaxNode, WorkspaceIndex, ParsedFile, FieldDecl } from "../types.js";

interface MetaResult {
  scope: string;
  type?: string | null;
  entries: MetaEntry[];
}

export function register(program: Command): void {
  program
    .command("meta <scope> [path]")
    .description("Extract metadata for a schema, field, mapping, or metric")
    .option("--tags-only", "only output tag tokens, one per line")
    .option("--json", "structured JSON output")
    .action(async (scope: string, pathArg: string | undefined, opts: { tagsOnly?: boolean; json?: boolean }) => {
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

      let result: MetaResult;
      if (scope.includes(".")) {
        result = extractFieldMeta(scope, parsedFiles, index);
      } else {
        result = extractBlockMeta(scope, parsedFiles, index);
      }

      if (opts.tagsOnly) {
        const tags = result.entries
          .filter((e): e is Extract<MetaEntry, { kind: "tag" }> => e.kind === "tag")
          .map((e) => e.tag);
        if (tags.length === 0) {
          console.log("No tags found.");
          return;
        }
        for (const tag of tags) {
          console.log(tag);
        }
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      printDefault(result);
    });
}

function extractBlockMeta(blockName: string, parsedFiles: ParsedFile[], index: WorkspaceIndex): MetaResult {
  // Determine block type, resolving namespace-qualified keys
  const blockTypes: string[] = [];
  let resolvedName = blockName;
  const schemaResolved = resolveIndexKey(blockName, index.schemas);
  const mappingResolved = resolveIndexKey(blockName, index.mappings);
  const metricResolved = resolveIndexKey(blockName, index.metrics);
  if (schemaResolved) { blockTypes.push("schema_block"); resolvedName = schemaResolved.key; }
  if (mappingResolved) { blockTypes.push("mapping_block"); resolvedName = mappingResolved.key; }
  if (metricResolved) { blockTypes.push("metric_block"); resolvedName = metricResolved.key; }

  if (blockTypes.length === 0) {
    console.error(`'${blockName}' not found as a schema, mapping, or metric.`);
    const allNames = [
      ...index.schemas.keys(),
      ...index.mappings.keys(),
      ...index.metrics.keys(),
    ];
    const close = allNames.find(
      (k) => k.toLowerCase() === blockName.toLowerCase(),
    );
    if (close) console.error(`Did you mean '${close}'?`);
    process.exit(1);
  }

  const resolvedEntry =
    schemaResolved?.entry ?? mappingResolved?.entry ?? metricResolved?.entry ?? null;

  const parsed = resolvedEntry
    ? parsedFiles.find((p) => p.filePath === resolvedEntry.file)
    : null;
  if (parsed) {
    for (const blockType of blockTypes) {
      const node = findBlockNode(parsed.tree.rootNode, blockType, resolvedName);
      if (!node) continue;
      const metaNode = node.namedChildren.find(
        (c) => c.type === "metadata_block",
      );
      return { scope: blockName, entries: extractMetadata(metaNode) };
    }
  }

  return { scope: blockName, entries: [] };
}

function extractFieldMeta(fieldRef: string, parsedFiles: ParsedFile[], index: WorkspaceIndex): MetaResult {
  const dot = fieldRef.indexOf(".");
  const entityName = fieldRef.slice(0, dot);
  const fieldPath = fieldRef.slice(dot + 1);
  // Support nested paths like schema.record.field by using the last segment as field name
  // and intermediate segments to navigate into record/list blocks
  const pathSegments = fieldPath.split(".");
  const fieldName = pathSegments[pathSegments.length - 1]!;

  // Search schemas, then fragments, then metrics
  type ResolvedEntity = { key: string; entry: { fields: FieldDecl[]; file: string; namespace?: string } };
  let resolved: ResolvedEntity | null = resolveIndexKey(entityName, index.schemas);
  let blockType = "schema_block";
  let bodyType = "schema_body";
  if (!resolved) {
    resolved = resolveIndexKey(entityName, index.fragments);
    blockType = "fragment_block";
    bodyType = "schema_body";
  }
  if (!resolved) {
    resolved = resolveIndexKey(entityName, index.metrics);
    blockType = "metric_block";
    bodyType = "metric_body";
  }
  if (!resolved) {
    console.error(`'${entityName}' not found in schemas, fragments, or metrics.`);
    process.exit(1);
  }

  const entity = resolved.entry;
  const field = findFieldByPath(entity.fields, pathSegments);
  if (!field) {
    console.error(
      `Field '${fieldPath}' not found in '${entityName}'.`,
    );
    process.exit(1);
  }

  const parsed = parsedFiles.find((p) => p.filePath === entity.file);
  const entityNode = parsed ? findBlockNode(parsed.tree.rootNode, blockType, resolved.key) : null;
  const body = entityNode?.namedChildren.find((c) => c.type === bodyType);
  if (body) {
    const targetBody = navigateToNestedBody(body, pathSegments.slice(0, -1));
    if (targetBody) {
      for (const fieldDecl of findFieldDecls(targetBody, fieldName)) {
        const metaNode = fieldDecl.namedChildren.find(
          (c) => c.type === "metadata_block",
        );
        const entries = extractMetadata(metaNode);
        return {
            scope: fieldRef,
            type: field?.type ?? null,
            entries,
          };
        }
    }
  }

  return { scope: fieldRef, type: field.type, entries: [] };
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

function findField(fields: FieldDecl[], fieldName: string): FieldDecl | null {
  for (const field of fields) {
    if (field.name === fieldName) return field;
    if (field.children) {
      const nested = findField(field.children, fieldName);
      if (nested) return nested;
    }
  }
  return null;
}

function findFieldByPath(fields: FieldDecl[], segments: string[]): FieldDecl | null {
  if (segments.length === 0) return null;
  if (segments.length === 1) return findField(fields, segments[0]!);
  // Navigate into nested record/list by matching intermediate segments
  for (const field of fields) {
    if (field.name === segments[0] && field.children) {
      return findFieldByPath(field.children, segments.slice(1));
    }
  }
  // Fallback: flat search for the last segment
  return findField(fields, segments[segments.length - 1]!);
}

function navigateToNestedBody(body: SyntaxNode, intermediateSegments: string[]): SyntaxNode {
  let current = body;
  for (const seg of intermediateSegments) {
    let found = false;
    for (const c of current.namedChildren) {
      if (c.type === "record_block" || c.type === "list_block") {
        if (getBlockLabelName(c) === seg) {
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

function getBlockLabelName(block: SyntaxNode): string | null {
  const label = block.namedChildren.find((c) => c.type === "block_label");
  if (!label) return null;
  const inner = label.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "quoted_name") return inner.text.slice(1, -1);
  return inner.text;
}

function findFieldDecls(bodyNode: SyntaxNode, fieldName: string, acc: SyntaxNode[] = []): SyntaxNode[] {
  for (const child of bodyNode.namedChildren) {
    if (child.type === "field_decl" && getFieldDeclName(child) === fieldName) {
      acc.push(child);
      continue;
    }
    if (child.type === "record_block" || child.type === "list_block") {
      if (getBlockLabelName(child) === fieldName) {
        acc.push(child);
        continue;
      }
      const nestedBody = child.namedChildren.find((c) => c.type === "schema_body");
      if (nestedBody) findFieldDecls(nestedBody, fieldName, acc);
    }
  }
  return acc;
}

function printDefault(result: MetaResult): void {
  console.log(`Metadata for '${result.scope}':`);
  if (result.type) {
    console.log(`  type: ${result.type}`);
  }
  console.log();

  if (result.entries.length === 0) {
    console.log("  (no metadata)");
    return;
  }

  for (const entry of result.entries) {
    if (entry.kind === "tag") {
      console.log(`  [tag] ${entry.tag}`);
    } else if (entry.kind === "kv") {
      console.log(`  ${entry.key}: ${entry.value}`);
    } else if (entry.kind === "enum") {
      console.log(`  enum { ${entry.values.join(", ")} }`);
    } else if (entry.kind === "note") {
      const text = entry.text.length > 100
        ? entry.text.slice(0, 97) + "..."
        : entry.text;
      console.log(`  note: ${text}`);
    } else if (entry.kind === "slice") {
      console.log(`  slice { ${entry.values.join(", ")} }`);
    }
  }
}
