/**
 * metric.ts — `satsuma metric <name>` command
 *
 * Looks up a metric by name and renders it. Output modes:
 *   default    — reconstructed metric block with metadata and measure fields
 *   --compact  — suppress note text
 *   --sources  — print source names only (one per line)
 *   --json     — full structured JSON output
 *
 * Exits 1 if the metric name is not found.
 */

import type { Command } from "commander";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { findBlockNode } from "../cst-query.js";
import type { SyntaxNode, MetricRecord } from "../types.js";

export function register(program: Command): void {
  program
    .command("metric <name> [path]")
    .description("Show a metric definition")
    .option("--compact", "suppress note text")
    .option("--sources", "print source schema names only (one per line)")
    .option("--json", "output JSON")
    .addHelpText("after", `
Names can be namespace-qualified (e.g. analytics::daily_sales).

Examples:
  satsuma metric daily_sales                         # full metric
  satsuma metric daily_sales --sources               # just source schemas
  satsuma metric analytics::daily_sales --json       # namespace-qualified`)
    .action(async (name: string, pathArg: string | undefined, opts: { compact?: boolean; sources?: boolean; json?: boolean }) => {
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

interface MetaEntry {
  key: string;
  value: string | null;
  quoted?: boolean;
}

/**
 * Extract metadata entries from a metadata_block for display.
 * Returns an array of {key, value} pairs where value may be multi-word.
 */
function extractMetaEntries(metaNode: SyntaxNode | undefined): MetaEntry[] {
  if (!metaNode) return [];
  const entries: MetaEntry[] = [];
  for (const c of metaNode.namedChildren) {
    if (c.type === "key_value_pair") {
      const key = c.namedChildren.find((x) => x.type === "kv_key");
      const val = c.namedChildren.find((x) => x.type !== "kv_key");
      if (key) {
        let valText = val?.text ?? "";
        const quoted = val?.type === "nl_string" || val?.type === "multiline_string";
        if (val?.type === "nl_string") valText = val.text.slice(1, -1);
        entries.push({ key: key.text, value: valText, quoted });
      }
    } else if (c.type === "tag_token") {
      entries.push({ key: c.text, value: null });
    } else if (c.type === "slice_body") {
      const sliceNames = c.namedChildren
        .filter((x) => x.type === "identifier")
        .map((x) => x.text);
      entries.push({ key: "slice", value: `{${sliceNames.join(", ")}}` });
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
function formatMeta(entries: MetaEntry[]): string {
  if (entries.length === 0) return "";
  const format = (e: MetaEntry): string => {
    if (e.value === null) return e.key;
    const displayVal = e.quoted ? `"${e.value}"` : e.value;
    return `${e.key} ${displayVal}`;
  };
  if (entries.length <= 2) {
    return ` (${entries.map(format).join(", ")})`;
  }
  const lines = entries.map((e) => `  ${format(e)}`).join(",\n");
  return ` (\n${lines}\n)`;
}

// ── Formatters ────────────────────────────────────────────────────────────────

function extractNoteText(node: SyntaxNode | undefined): string | null {
  if (!node) return null;
  const strNode = node.namedChildren.find(
    (x) => x.type === "nl_string" || x.type === "multiline_string",
  );
  if (!strNode) return null;
  if (strNode.type === "multiline_string") return strNode.text.slice(3, -3).trim();
  return strNode.text.slice(1, -1);
}

function printJson(entry: MetricRecord, metricNode: SyntaxNode | null): void {
  const meta = metricNode
    ? extractMetaEntries(metricNode.namedChildren.find((c) => c.type === "metadata_block"))
    : [];
  const body = metricNode?.namedChildren.find((c) => c.type === "metric_body");
  const noteBlock = body?.namedChildren.find((c) => c.type === "note_block");
  const note = extractNoteText(noteBlock);
  console.log(
    JSON.stringify(
      {
        name: entry.name,
        ...(entry.namespace ? { namespace: entry.namespace } : {}),
        displayName: entry.displayName,
        sources: entry.sources,
        grain: entry.grain,
        ...(entry.slices.length > 0 ? { slices: entry.slices } : {}),
        fields: entry.fields,
        ...(note != null ? { note } : {}),
        metadata: meta,
        file: entry.file,
        row: entry.row,
      },
      null,
      2,
    ),
  );
}

function printDefault(entry: MetricRecord, metricNode: SyntaxNode | null, compact: boolean | undefined): void {
  const metaNode = metricNode?.namedChildren.find((c) => c.type === "metadata_block");
  const meta = extractMetaEntries(metaNode);
  const display = entry.displayName ? ` "${entry.displayName}"` : "";
  const metaStr = formatMeta(meta);
  const baseName = entry.name && entry.name.includes(" ") ? `'${entry.name}'` : (entry.name ?? "");
  const nameStr = entry.namespace ? `${entry.namespace}::${baseName}` : baseName;
  console.log(`metric ${nameStr}${display}${metaStr} {`);

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
      } else if ((c.type === "comment" || c.type === "warning_comment" || c.type === "question_comment") && !compact) {
        console.log(`  ${c.text}`);
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
