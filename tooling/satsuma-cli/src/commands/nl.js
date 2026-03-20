/**
 * nl.js — `satsuma nl <scope>` command
 *
 * Extracts all NL content (notes, transforms, comments) within a scope.
 * Scope: schema <name>, mapping <name>, field <schema.field>, or all.
 *
 * Flags:
 *   --kind <type>  filter to: note, warning, question, or transform
 *   --json         structured JSON output
 */

import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { extractNLContent } from "../nl-extract.js";
import { findBlockNode, getBlockName } from "../cst-query.js";

/** @param {import('commander').Command} program */
export function register(program) {
  program
    .command("nl <scope> [path]")
    .description("Extract NL content from a scope (schema, mapping, field, or all)")
    .option("--kind <type>", "filter by kind: note, warning, question, transform")
    .option("--json", "structured JSON output")
    .action(async (scope, pathArg, opts) => {
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

      let items;
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

function extractFromAll(parsedFiles) {
  const items = [];
  for (const { filePath, tree } of parsedFiles) {
    for (const item of extractNLContent(tree.rootNode)) {
      items.push({ ...item, file: filePath });
    }
  }
  return items;
}

function extractFromBlock(blockName, parsedFiles, index) {
  // Check if it's a schema, mapping, or metric (resolving namespace-qualified keys)
  const schemaResolved = resolveIndexKey(blockName, index.schemas);
  const mappingResolved = resolveIndexKey(blockName, index.mappings);
  const metricResolved = resolveIndexKey(blockName, index.metrics);

  if (!schemaResolved && !mappingResolved && !metricResolved) {
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

  const resolvedKey = (schemaResolved ?? mappingResolved ?? metricResolved).key;
  const resolvedEntry = (schemaResolved ?? mappingResolved ?? metricResolved).entry;
  const blockType = schemaResolved
    ? "schema_block"
    : mappingResolved
      ? "mapping_block"
      : "metric_block";

  const items = [];
  const parsed = parsedFiles.find((p) => p.filePath === resolvedEntry.file);
  const node = parsed ? findBlockNode(parsed.tree.rootNode, blockType, resolvedKey) : null;
  if (node) {
    for (const item of extractNLContent(node, blockName)) {
      items.push({ ...item, file: resolvedEntry.file });
    }
  }
  return items;
}

function extractFromField(fieldRef, parsedFiles, index) {
  const dot = fieldRef.indexOf(".");
  const schemaName = fieldRef.slice(0, dot);
  const fieldName = fieldRef.slice(dot + 1);

  const resolvedSchema = resolveIndexKey(schemaName, index.schemas);
  if (!resolvedSchema) {
    console.error(`Schema '${schemaName}' not found.`);
    process.exit(1);
  }

  const schema = resolvedSchema.entry;
  if (!schemaHasField(schema.fields, fieldName)) {
    console.error(
      `Field '${fieldName}' not found in schema '${schemaName}'.`,
    );
    process.exit(1);
  }

  const items = [];
  const parsed = parsedFiles.find((p) => p.filePath === schema.file);
  const schemaNode = parsed ? findBlockNode(parsed.tree.rootNode, "schema_block", resolvedSchema.key) : null;
  const body = schemaNode?.namedChildren.find((c) => c.type === "schema_body");
  if (body) {
    for (const fieldDecl of findFieldDecls(body, fieldName)) {
      for (const item of extractNLContent(fieldDecl, fieldName)) {
        items.push({ ...item, file: schema.file });
      }
    }
  }

  // Also extract NL from arrows targeting/sourcing this field in mappings
  for (const { filePath, tree } of parsedFiles) {
    const root = tree.rootNode;
    for (const mappingNode of [...iterBlocks(root)].filter(
      (c) => c.type === "mapping_block",
    )) {
      const body = mappingNode.namedChildren.find(
        (c) => c.type === "mapping_body",
      );
      if (!body) continue;

      for (const arrow of body.namedChildren) {
        if (arrow.type !== "map_arrow" && arrow.type !== "computed_arrow")
          continue;
        const src = arrow.namedChildren.find((c) => c.type === "src_path");
        const tgt = arrow.namedChildren.find((c) => c.type === "tgt_path");
        const srcText = src?.namedChildren[0]?.text ?? null;
        const tgtText = tgt?.namedChildren[0]?.text ?? null;
        if (srcText !== fieldName && tgtText !== fieldName) continue;

        for (const item of extractNLContent(
          arrow,
          `${getBlockName(mappingNode) ?? "?"}`,
        )) {
          items.push({ ...item, file: filePath });
        }
      }
    }
  }

  return items;
}

/** Yield block nodes from rootNode, searching inside namespace_block children. */
function* iterBlocks(rootNode) {
  for (const c of rootNode.namedChildren) {
    if (c.type === "namespace_block") {
      yield* iterBlocks(c);
    } else {
      yield c;
    }
  }
}

function getFieldDeclName(fieldDecl) {
  const nameNode = fieldDecl.namedChildren.find(
    (c) => c.type === "field_name",
  );
  const inner = nameNode?.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "backtick_name") return inner.text.slice(1, -1);
  return inner.text;
}

function schemaHasField(fields, fieldName) {
  for (const field of fields) {
    if (field.name === fieldName) return true;
    if (field.children && schemaHasField(field.children, fieldName)) return true;
  }
  return false;
}

function findFieldDecls(bodyNode, fieldName, acc = []) {
  for (const child of bodyNode.namedChildren) {
    if (child.type === "field_decl" && getFieldDeclName(child) === fieldName) {
      acc.push(child);
      continue;
    }
    if (child.type === "record_block" || child.type === "list_block") {
      const nestedBody = child.namedChildren.find((c) => c.type === "schema_body");
      if (nestedBody) findFieldDecls(nestedBody, fieldName, acc);
    }
  }
  return acc;
}

function printDefault(items) {
  for (const item of items) {
    const prefix = item.kind === "warning" ? "//! " :
      item.kind === "question" ? "//? " :
        item.kind === "transform" ? "[transform] " :
          "[note] ";
    const parent = item.parent ? ` (${item.parent})` : "";
    const text = item.text.length > 120
      ? item.text.slice(0, 117) + "..."
      : item.text;
    console.log(`${prefix}${text}${parent}`);
  }
}
