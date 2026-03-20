/**
 * schema.js — `satsuma schema <name>` command
 *
 * Looks up a schema by name and renders it. Output modes:
 *   default    — reconstructed schema with nesting and notes
 *   --compact  — omit note text and inline NL strings
 *   --fields-only — one field per line: <name>  <type>  [<metadata>]
 *   --json     — structured field list
 *
 * Exits 1 if the schema name is not found.
 */

import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { findBlockNode } from "../cst-query.js";
import { expandEntityFields } from "../spread-expand.js";

/** @param {import('commander').Command} program */
export function register(program) {
  program
    .command("schema <name> [path]")
    .description("Show a schema definition")
    .option("--compact", "omit notes and inline strings")
    .option("--fields-only", "one line per field")
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

      // Build index to locate the schema; also keep the per-file CST for
      // full reconstruction from the raw node.
      const parsedFiles = files.map((f) => parseFile(f));
      const index = buildIndex(parsedFiles);

      const resolved = resolveIndexKey(name, index.schemas);
      if (!resolved) {
        const keys = [...index.schemas.keys()];
        const close = keys.find((k) => k.toLowerCase() === name.toLowerCase());
        // Check for ambiguous unqualified name
        const ambiguous = !name.includes("::") && keys.filter((k) => k.endsWith(`::${name}`));
        if (ambiguous && ambiguous.length > 1) {
          console.error(`Schema '${name}' is ambiguous. Found in: ${ambiguous.join(", ")}`);
        } else if (close) {
          console.error(`Schema '${name}' not found. Did you mean '${close}'?`);
        } else {
          console.error(`Schema '${name}' not found.`);
          if (keys.length > 0) console.error(`Available: ${keys.join(", ")}`);
        }
        process.exit(1);
      }
      const entry = resolved.entry;

      // Find the raw CST node for richer reconstruction
      const parsed = parsedFiles.find((p) => p.filePath === entry.file);
      const schemaNode = parsed
        ? findBlockNode(parsed.tree.rootNode, "schema_block", resolved.key)
        : null;

      if (opts.json) {
        printJson(entry, schemaNode, index);
      } else if (opts.fieldsOnly) {
        printFieldsOnly(entry);
      } else {
        printDefault(entry, schemaNode, opts.compact);
      }
    });
}

// ── CST helpers ───────────────────────────────────────────────────────────────

/** Collect fields from schema_body, recursing into record_block / list_block. */
function collectFields(bodyNode, indent = 0) {
  const lines = [];
  for (const c of bodyNode.namedChildren) {
    const pad = "  ".repeat(indent);
    if (c.type === "field_decl") {
      const nameNode = c.namedChildren.find((x) => x.type === "field_name");
      const typeNode = c.namedChildren.find((x) => x.type === "type_expr");
      const meta = c.namedChildren.find((x) => x.type === "metadata_block");
      const inner = nameNode?.namedChildren[0];
      let fname = inner?.text ?? "";
      if (inner?.type === "backtick_name") fname = fname.slice(1, -1);
      const metaText = meta ? ` ${meta.text}` : "";
      lines.push({ indent, text: `${pad}${fname.padEnd(24)}${typeNode?.text ?? ""}${metaText}` });
    } else if (c.type === "record_block" || c.type === "list_block") {
      const kind = c.type === "record_block" ? "record" : "list";
      const lbl = c.namedChildren.find((x) => x.type === "block_label");
      const inner = lbl?.namedChildren[0];
      let lname = inner?.text ?? "";
      if (inner?.type === "quoted_name") lname = lname.slice(1, -1);
      lines.push({ indent, text: `${pad}${kind} ${lname} {` });
      const nested = c.namedChildren.find((x) => x.type === "schema_body");
      if (nested) lines.push(...collectFields(nested, indent + 1));
      lines.push({ indent, text: `${pad}}` });
    } else if (c.type === "fragment_spread") {
      const lbl = c.namedChildren.find((x) => x.type === "spread_label");
      let sname = "";
      if (lbl) {
        const q = lbl.namedChildren.find((x) => x.type === "quoted_name");
        if (q) {
          sname = q.text;
        } else {
          sname = lbl.namedChildren
            .filter((x) => x.type === "identifier" || x.type === "qualified_name")
            .map((x) => x.text)
            .join(" ");
        }
      }
      lines.push({ indent, text: `${pad}...${sname}` });
    }
  }
  return lines;
}

// ── Formatters ────────────────────────────────────────────────────────────────

function printJson(entry, schemaNode, index) {
  const spreadFields = expandEntityFields(entry, entry.namespace ?? null, index);
  const allFields = [...entry.fields, ...spreadFields];
  const out = {
    name: entry.name,
    note: entry.note,
    file: entry.file,
    row: entry.row,
    fields: allFields,
  };

  // Enrich with nested structure if CST is available
  if (schemaNode) {
    const body = schemaNode.namedChildren.find((c) => c.type === "schema_body");
    if (body) {
      out.fieldLines = collectFields(body).map((l) => l.text.trim());
    }
  }

  console.log(JSON.stringify(out, null, 2));
}

function printFieldsOnly(entry) {
  for (const f of entry.fields) {
    console.log(`${f.name.padEnd(24)}${f.type}`);
  }
}

function printDefault(entry, schemaNode, compact) {
  const note = entry.note && !compact ? `  (note "${entry.note}")` : "";
  console.log(`schema ${entry.name}${note} {`);

  if (schemaNode) {
    const body = schemaNode.namedChildren.find((c) => c.type === "schema_body");
    if (body) {
      for (const { text } of collectFields(body, 1)) {
        if (compact) {
          // Strip inline note text: remove (note "...") from metadata
          console.log(text.replace(/\s*\(note\s+"[^"]*"\)/, "").replace(/\s*\(note\s+"""[^"]*"""\)/, ""));
        } else {
          console.log(text);
        }
      }
    }
  } else {
    // Fallback to index fields
    for (const f of entry.fields) {
      console.log(`  ${f.name.padEnd(24)}${f.type}`);
    }
  }

  console.log("}");
}
