/**
 * meta.js — `satsuma meta <scope>` command
 *
 * Extracts metadata entries for a block or field.
 * Scope: schema <name>, field <schema.field>, mapping <name>, metric <name>.
 *
 * Flags:
 *   --tags-only   just tag tokens, one per line
 *   --json        structured metadata object
 */

import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { extractMetadata } from "../meta-extract.js";
import { findBlockNode } from "../cst-query.js";

/** @param {import('commander').Command} program */
export function register(program) {
  program
    .command("meta <scope> [path]")
    .description("Extract metadata for a schema, field, mapping, or metric")
    .option("--tags-only", "only output tag tokens, one per line")
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

      let result;
      if (scope.includes(".")) {
        result = extractFieldMeta(scope, parsedFiles, index);
      } else {
        result = extractBlockMeta(scope, parsedFiles, index);
      }

      if (opts.tagsOnly) {
        const tags = result.entries
          .filter((e) => e.kind === "tag")
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

function extractBlockMeta(blockName, parsedFiles, index) {
  // Determine block type, resolving namespace-qualified keys
  const blockTypes = [];
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

function extractFieldMeta(fieldRef, parsedFiles, index) {
  const dot = fieldRef.indexOf(".");
  const schemaName = fieldRef.slice(0, dot);
  const fieldName = fieldRef.slice(dot + 1);

  const resolvedSchema = resolveIndexKey(schemaName, index.schemas);
  if (!resolvedSchema) {
    console.error(`Schema '${schemaName}' not found.`);
    process.exit(1);
  }

  const schema = resolvedSchema.entry;
  const field = findField(schema.fields, fieldName);
  if (!field) {
    console.error(
      `Field '${fieldName}' not found in schema '${schemaName}'.`,
    );
    process.exit(1);
  }

  const parsed = parsedFiles.find((p) => p.filePath === schema.file);
  const schemaNode = parsed ? findBlockNode(parsed.tree.rootNode, "schema_block", resolvedSchema.key) : null;
  const body = schemaNode?.namedChildren.find((c) => c.type === "schema_body");
  if (body) {
    for (const fieldDecl of findFieldDecls(body, fieldName)) {
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

  return { scope: fieldRef, type: field.type, entries: [] };
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

function findField(fields, fieldName) {
  for (const field of fields) {
    if (field.name === fieldName) return field;
    if (field.children) {
      const nested = findField(field.children, fieldName);
      if (nested) return nested;
    }
  }
  return null;
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

function printDefault(result) {
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
