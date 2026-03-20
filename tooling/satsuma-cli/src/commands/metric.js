/**
 * metric.js — `satsuma metric <name>` command
 *
 * Looks up a metric by name and renders it. Output modes:
 *   default    — reconstructed metric block with metadata and measure fields
 *   --compact  — suppress note text
 *   --sources  — print source names only (one per line)
 *   --json     — full structured JSON output
 *
 * Exits 1 if the metric name is not found.
 */

import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { findBlockNode } from "../cst-query.js";

/** @param {import('commander').Command} program */
export function register(program) {
  program
    .command("metric <name> [path]")
    .description("Show a metric definition")
    .option("--compact", "suppress note text")
    .option("--sources", "print source names only")
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

      const parsedFiles = files.map((f) => parseFile(f));
      const index = buildIndex(parsedFiles);

      const resolved = resolveIndexKey(name, index.metrics);
      if (!resolved) {
        const keys = [...index.metrics.keys()];
        const close = keys.find((k) => k.toLowerCase() === name.toLowerCase());
        if (close) {
          console.error(`Metric '${name}' not found. Did you mean '${close}'?`);
        } else {
          console.error(`Metric '${name}' not found.`);
          if (keys.length > 0) console.error(`Available: ${keys.join(", ")}`);
        }
        process.exit(1);
      }
      const entry = resolved.entry;
      const resolvedName = resolved.key;

      const parsed = parsedFiles.find((p) => p.filePath === entry.file);
      const metricNode = parsed ? findBlockNode(parsed.tree.rootNode, "metric_block", resolvedName) : null;

      if (opts.json) {
        printJson(entry, metricNode);
      } else if (opts.sources) {
        for (const s of entry.sources) console.log(s);
      } else {
        printDefault(entry, metricNode, opts.compact);
      }
    });
}

// ── CST helpers ───────────────────────────────────────────────────────────────

/**
 * Extract metadata entries from a metadata_block for display.
 * Returns an array of {key, value} pairs where value may be multi-word.
 */
function extractMetaEntries(metaNode) {
  if (!metaNode) return [];
  const entries = [];
  for (const c of metaNode.namedChildren) {
    if (c.type === "key_value_pair") {
      const key = c.namedChildren.find((x) => x.type === "kv_key");
      const val = c.namedChildren.find((x) => x.type !== "kv_key");
      if (key) {
        let valText = val?.text ?? "";
        if (val?.type === "nl_string") valText = val.text.slice(1, -1);
        entries.push({ key: key.text, value: valText });
      }
    } else if (c.type === "tag_token") {
      entries.push({ key: c.text, value: null });
    }
  }
  return entries;
}

/**
 * Format metadata entries:
 * - 0 entries → empty string
 * - 1–2 entries → inline ( k v, k v )
 * - 3+ entries → multi-line
 */
function formatMeta(entries) {
  if (entries.length === 0) return "";
  const format = (e) => (e.value !== null ? `${e.key} ${e.value}` : e.key);
  if (entries.length <= 2) {
    return ` (${entries.map(format).join(", ")})`;
  }
  const lines = entries.map((e) => `  ${format(e)}`).join(",\n");
  return ` (\n${lines}\n)`;
}

// ── Formatters ────────────────────────────────────────────────────────────────

function printJson(entry, metricNode) {
  const meta = metricNode
    ? extractMetaEntries(metricNode.namedChildren.find((c) => c.type === "metadata_block"))
    : [];
  console.log(
    JSON.stringify(
      {
        name: entry.name,
        displayName: entry.displayName,
        sources: entry.sources,
        grain: entry.grain,
        fields: entry.fields,
        metadata: meta,
        file: entry.file,
        row: entry.row,
      },
      null,
      2,
    ),
  );
}

function printDefault(entry, metricNode, compact) {
  const metaNode = metricNode?.namedChildren.find((c) => c.type === "metadata_block");
  const meta = extractMetaEntries(metaNode);
  const display = entry.displayName ? ` "${entry.displayName}"` : "";
  const metaStr = formatMeta(meta);
  console.log(`metric ${entry.name}${display}${metaStr} {`);

  // Fields from metric_body
  const body = metricNode?.namedChildren.find((c) => c.type === "metric_body");
  if (body) {
    for (const c of body.namedChildren) {
      if (c.type === "field_decl") {
        const nameNode = c.namedChildren.find((x) => x.type === "field_name");
        const typeNode = c.namedChildren.find((x) => x.type === "type_expr");
        const metaDecl = c.namedChildren.find((x) => x.type === "metadata_block");
        const inner = nameNode?.namedChildren[0];
        const fname = inner?.text ?? "";
        const metaDeclText = metaDecl && !compact ? ` ${metaDecl.text}` : "";
        console.log(`  ${fname.padEnd(20)}${typeNode?.text ?? ""}${metaDeclText}`);
      } else if (c.type === "note_block" && !compact) {
        console.log(`  note { ... }`);
      }
    }
  } else {
    // Fallback to index fields
    for (const f of entry.fields) {
      console.log(`  ${f.name.padEnd(20)}${f.type}`);
    }
  }

  console.log("}");
}
