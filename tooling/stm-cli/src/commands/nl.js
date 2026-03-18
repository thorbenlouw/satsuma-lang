/**
 * nl.js — `stm nl <scope>` command
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
import { buildIndex } from "../index-builder.js";
import { extractNLContent } from "../nl-extract.js";

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
  // Check if it's a schema, mapping, or metric
  const isSchema = index.schemas.has(blockName);
  const isMapping = index.mappings.has(blockName);
  const isMetric = index.metrics.has(blockName);

  if (!isSchema && !isMapping && !isMetric) {
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

  const blockType = isSchema
    ? "schema_block"
    : isMapping
      ? "mapping_block"
      : "metric_block";

  const items = [];
  for (const { filePath, tree } of parsedFiles) {
    const root = tree.rootNode;
    for (const node of root.namedChildren) {
      if (node.type !== blockType) continue;
      if (getBlockName(node) !== blockName) continue;
      for (const item of extractNLContent(node, blockName)) {
        items.push({ ...item, file: filePath });
      }
    }
  }
  return items;
}

function extractFromField(fieldRef, parsedFiles, index) {
  const dot = fieldRef.indexOf(".");
  const schemaName = fieldRef.slice(0, dot);
  const fieldName = fieldRef.slice(dot + 1);

  if (!index.schemas.has(schemaName)) {
    console.error(`Schema '${schemaName}' not found.`);
    process.exit(1);
  }

  const schema = index.schemas.get(schemaName);
  if (!schema.fields.some((f) => f.name === fieldName)) {
    console.error(
      `Field '${fieldName}' not found in schema '${schemaName}'.`,
    );
    process.exit(1);
  }

  const items = [];
  for (const { filePath, tree } of parsedFiles) {
    const root = tree.rootNode;
    for (const node of root.namedChildren) {
      if (node.type !== "schema_block") continue;
      if (getBlockName(node) !== schemaName) continue;
      const body = node.namedChildren.find((c) => c.type === "schema_body");
      if (!body) continue;

      for (const fieldDecl of body.namedChildren) {
        if (fieldDecl.type !== "field_decl") continue;
        if (getFieldDeclName(fieldDecl) !== fieldName) continue;
        for (const item of extractNLContent(fieldDecl, fieldName)) {
          items.push({ ...item, file: filePath });
        }
      }
    }
  }

  // Also extract NL from arrows targeting/sourcing this field in mappings
  for (const { filePath, tree } of parsedFiles) {
    const root = tree.rootNode;
    for (const mappingNode of root.namedChildren.filter(
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

function getBlockName(node) {
  const lbl = node.namedChildren.find((c) => c.type === "block_label");
  const inner = lbl?.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "quoted_name") return inner.text.slice(1, -1);
  return inner.text;
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
