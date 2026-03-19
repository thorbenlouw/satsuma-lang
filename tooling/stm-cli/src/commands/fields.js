/**
 * fields.js — `stm fields <schema>` command
 *
 * Lists all fields in a schema with types. Key feature: --unmapped-by <mapping>
 * computes the set-difference between declared fields and arrow target paths.
 *
 * Flags:
 *   --with-meta         include metadata tags inline
 *   --unmapped-by <m>   only fields with no arrows in mapping <m>
 *   --json              structured JSON output
 */

import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex } from "../index-builder.js";

/** @param {import('commander').Command} program */
export function register(program) {
  program
    .command("fields <schema> [path]")
    .description("List fields in a schema with types")
    .option("--with-meta", "include metadata tags")
    .option("--unmapped-by <mapping>", "only unmapped fields relative to a mapping")
    .option("--json", "structured JSON output")
    .action(async (schemaName, pathArg, opts) => {
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

      if (!index.schemas.has(schemaName)) {
        console.error(`Schema '${schemaName}' not found.`);
        const close = [...index.schemas.keys()].find(
          (k) => k.toLowerCase() === schemaName.toLowerCase(),
        );
        if (close) console.error(`Did you mean '${close}'?`);
        process.exit(1);
      }

      const schema = index.schemas.get(schemaName);
      let fields = schema.fields.map((f) => ({ ...f }));

      // Enrich with metadata if requested
      if (opts.withMeta) {
        enrichFieldMeta(schemaName, fields, parsedFiles);
      }

      // Filter to unmapped fields
      if (opts.unmappedBy) {
        if (!index.mappings.has(opts.unmappedBy)) {
          console.error(`Mapping '${opts.unmappedBy}' not found.`);
          const close = [...index.mappings.keys()].find(
            (k) => k.toLowerCase() === opts.unmappedBy.toLowerCase(),
          );
          if (close) console.error(`Did you mean '${close}'?`);
          process.exit(1);
        }

        const mappedFields = getMappedFieldNames(opts.unmappedBy, schemaName, index);
        fields = fields.filter((f) => !mappedFields.has(f.name));
      }

      if (opts.json) {
        console.log(JSON.stringify(fields, null, 2));
        return;
      }

      if (fields.length === 0) {
        if (opts.unmappedBy) {
          console.log(
            `All fields in '${schemaName}' are mapped by '${opts.unmappedBy}'.`,
          );
        } else {
          console.log(`Schema '${schemaName}' has no fields.`);
        }
        return;
      }

      printDefault(schemaName, fields, opts);
    });
}

/**
 * Get the set of field names from the given schema that participate in arrows
 * for the specified mapping — checking both source and target sides.
 */
function getMappedFieldNames(mappingName, schemaName, index) {
  const mapped = new Set();
  const mapping = index.mappings.get(mappingName);
  if (!mapping) return mapped;

  const isSource = mapping.sources.includes(schemaName);
  const isTarget = mapping.targets.includes(schemaName);

  for (const [_key, arrows] of index.fieldArrows) {
    for (const arrow of arrows) {
      if (arrow.mapping !== mappingName) continue;
      if (isSource && arrow.source) mapped.add(arrow.source.replace(/\[\]$/, ""));
      if (isTarget && arrow.target) mapped.add(arrow.target.replace(/\[\]$/, ""));
    }
  }
  return mapped;
}

/**
 * Enrich field objects with metadata tags from the CST.
 */
function enrichFieldMeta(schemaName, fields, parsedFiles) {
  for (const { tree } of parsedFiles) {
    const root = tree.rootNode;
    for (const schemaNode of root.namedChildren.filter(
      (c) => c.type === "schema_block",
    )) {
      const lbl = schemaNode.namedChildren.find((c) => c.type === "block_label");
      const inner = lbl?.namedChildren[0];
      let name = inner?.text ?? "";
      if (inner?.type === "quoted_name") name = name.slice(1, -1);
      if (name !== schemaName) continue;

      const body = schemaNode.namedChildren.find(
        (c) => c.type === "schema_body",
      );
      if (!body) continue;

      for (const fieldDecl of body.namedChildren.filter(
        (c) => c.type === "field_decl",
      )) {
        const nameNode = fieldDecl.namedChildren.find(
          (c) => c.type === "field_name",
        );
        const fieldInner = nameNode?.namedChildren[0];
        let fieldName = fieldInner?.text ?? "";
        if (fieldInner?.type === "backtick_name")
          fieldName = fieldName.slice(1, -1);

        const field = fields.find((f) => f.name === fieldName);
        if (!field) continue;

        const meta = fieldDecl.namedChildren.find(
          (c) => c.type === "metadata_block",
        );
        if (!meta) continue;

        const tags = [];
        for (const entry of meta.namedChildren) {
          if (entry.type === "tag_token") {
            tags.push(entry.text);
          }
        }
        if (tags.length > 0) field.tags = tags;
      }
    }
  }
}

function printDefault(_schemaName, fields, opts) {
  const maxName = Math.max(...fields.map((f) => f.name.length));
  const maxType = Math.max(...fields.map((f) => f.type.length));

  for (const f of fields) {
    let line = `  ${f.name.padEnd(maxName)}  ${f.type.padEnd(maxType)}`;
    if (opts.withMeta && f.tags) {
      line += `  (${f.tags.join(", ")})`;
    }
    console.log(line);
  }
}
