/**
 * summary.js — `stm summary` command
 *
 * Prints a high-level overview of the STM workspace:
 *   - schemas (name, note, field count)
 *   - metrics (name, display name, field count)
 *   - mappings (name, sources → targets, arrow count)
 *   - fragments and transforms (name only)
 *   - warning and question counts
 *
 * Flags:
 *   --compact   names only (one per line, grouped by type)
 *   --json      full structured JSON output
 */

import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex } from "../index-builder.js";

/** @param {import('commander').Command} program */
export function register(program) {
  program
    .command("summary [path]")
    .description("Summarise an STM workspace or file")
    .option("--compact", "show names only")
    .option("--json", "output JSON")
    .action(async (pathArg, opts) => {
      const root = pathArg ?? ".";
      let files;
      try {
        files = await resolveInput(root);
      } catch (err) {
        console.error(`Error resolving path: ${err.message}`);
        process.exit(1);
      }

      if (files.length === 0) {
        console.error("No .stm files found.");
        process.exit(1);
      }

      const parsed = files.map((f) => {
        try {
          return parseFile(f);
        } catch (err) {
          console.error(`Parse error in ${f}: ${err.message}`);
          process.exit(1);
        }
      });

      const index = buildIndex(parsed);

      if (opts.json) {
        printJson(index);
      } else if (opts.compact) {
        printCompact(index);
      } else {
        printDefault(index, files.length);
      }
    });
}

// ── Formatters ────────────────────────────────────────────────────────────────

function printJson(index) {
  const out = {
    schemas: [...index.schemas.values()].map((s) => ({
      name: s.name,
      note: s.note,
      fieldCount: s.fields.length,
      file: s.file,
      row: s.row,
    })),
    metrics: [...index.metrics.values()].map((m) => ({
      name: m.name,
      displayName: m.displayName,
      fieldCount: m.fields.length,
      grain: m.grain,
      sources: m.sources,
      file: m.file,
      row: m.row,
    })),
    mappings: [...index.mappings.values()].map((m) => ({
      name: m.name,
      sources: m.sources,
      targets: m.targets,
      arrowCount: m.arrowCount,
      file: m.file,
      row: m.row,
    })),
    fragments: [...index.fragments.values()].map((f) => ({
      name: f.name,
      fieldCount: f.fields.length,
      file: f.file,
      row: f.row,
    })),
    transforms: [...index.transforms.values()].map((t) => ({
      name: t.name,
      file: t.file,
      row: t.row,
    })),
    warningCount: index.warnings.length,
    questionCount: index.questions.length,
    totalErrors: index.totalErrors,
  };
  console.log(JSON.stringify(out, null, 2));
}

function printCompact(index) {
  const section = (label, items) => {
    if (items.length === 0) return;
    console.log(`${label}:`);
    for (const name of items) console.log(`  ${name}`);
  };

  section("schemas", [...index.schemas.keys()]);
  section("metrics", [...index.metrics.keys()]);
  section("mappings", [...index.mappings.keys()]);
  section("fragments", [...index.fragments.keys()]);
  section("transforms", [...index.transforms.keys()]);
}

function printDefault(index, fileCount) {
  const schemas = [...index.schemas.values()];
  const metrics = [...index.metrics.values()];
  const mappings = [...index.mappings.values()];
  const fragments = [...index.fragments.values()];
  const transforms = [...index.transforms.values()];

  console.log(`STM Workspace — ${fileCount} file${fileCount !== 1 ? "s" : ""}`);
  if (index.totalErrors > 0) {
    console.log(`  ⚠ parse errors: ${index.totalErrors}`);
  }
  console.log();

  if (schemas.length > 0) {
    console.log(`Schemas (${schemas.length}):`);
    for (const s of schemas) {
      const note = s.note ? `  — ${s.note}` : "";
      console.log(`  ${s.name}  [${s.fields.length} fields]${note}`);
    }
    console.log();
  }

  if (metrics.length > 0) {
    console.log(`Metrics (${metrics.length}):`);
    for (const m of metrics) {
      const display = m.displayName ? ` "${m.displayName}"` : "";
      const grain = m.grain ? `  grain=${m.grain}` : "";
      console.log(`  ${m.name}${display}  [${m.fields.length} fields]${grain}`);
    }
    console.log();
  }

  if (mappings.length > 0) {
    console.log(`Mappings (${mappings.length}):`);
    for (const m of mappings) {
      const name = m.name ?? "(anonymous)";
      const src = m.sources.join(", ") || "?";
      const tgt = m.targets.join(", ") || "?";
      console.log(`  ${name}  ${src} → ${tgt}  [${m.arrowCount} arrows]`);
    }
    console.log();
  }

  if (fragments.length > 0) {
    console.log(`Fragments (${fragments.length}):`);
    for (const f of fragments) {
      console.log(`  ${f.name}  [${f.fields.length} fields]`);
    }
    console.log();
  }

  if (transforms.length > 0) {
    console.log(`Transforms (${transforms.length}):`);
    for (const t of transforms) {
      console.log(`  ${t.name}`);
    }
    console.log();
  }

  const notes = [];
  if (index.warnings.length > 0) notes.push(`${index.warnings.length} warning comment${index.warnings.length !== 1 ? "s" : ""}`);
  if (index.questions.length > 0) notes.push(`${index.questions.length} question comment${index.questions.length !== 1 ? "s" : ""}`);
  if (notes.length > 0) console.log(notes.join("  ·  "));
}
