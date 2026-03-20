/**
 * context.js — `satsuma context <query>` command
 *
 * Given free-text, scores all workspace blocks by relevance and emits the
 * highest-scoring blocks within a token budget.
 *
 * Scoring (additive, higher = more relevant):
 *   +10  name contains a query term (case-insensitive)
 *   + 5  any field name contains a query term
 *   + 2  note text contains a query term
 *   + 1  any metadata key/value contains a query term
 *
 * Token estimate: Math.ceil(text.length / 4)  (rough GPT-style token count)
 *
 * Flags:
 *   --budget <n>   token budget (default 4000)
 *   --compact      omit notes and transform bodies in emitted blocks
 *   --json         emit ranked list as JSON (no budget truncation)
 */

import type { Command } from "commander";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex } from "../index-builder.js";
import { extractBacktickRefs } from "../nl-ref-extract.js";
import type { WorkspaceIndex } from "../types.js";

interface ScoredCandidate {
  name: string;
  type: string;
  score: number;
  file: string;
  row: number;
}

export function register(program: Command): void {
  program
    .command("context <query> [path]")
    .description("Rank and emit workspace blocks relevant to a query")
    .option("--budget <n>", "token budget", (v: string) => parseInt(v, 10), 4000)
    .option("--compact", "omit notes and transform bodies")
    .option("--json", "emit ranked JSON list")
    .action(async (query: string, pathArg: string | undefined, opts: { budget: number; compact?: boolean; json?: boolean }) => {
      const root = pathArg ?? ".";
      let files: string[];
      try {
        files = await resolveInput(root);
      } catch (err: unknown) {
        console.error(`Error resolving path: ${(err as Error).message}`);
        process.exit(1);
      }

      const parsedFiles = files.map((f) => parseFile(f));
      const index = buildIndex(parsedFiles);

      const terms = tokenize(query);
      const candidates = scoreAll(index, terms);
      candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

      if (opts.json) {
        console.log(
          JSON.stringify(
            candidates.map(({ name, type, score, file, row }) => ({
              name,
              type,
              score,
              file,
              row,
            })),
            null,
            2,
          ),
        );
        return;
      }

      // Emit within token budget
      const budget = opts.budget;
      let used = 0;
      const emitted: Array<ScoredCandidate & { block: string }> = [];

      for (const c of candidates) {
        const block = renderBlock(index, c, opts.compact);
        const tokens = estimateTokens(block);
        if (used + tokens > budget && emitted.length > 0) break;
        used += tokens;
        emitted.push({ ...c, block });
      }

      if (emitted.length === 0) {
        console.log("No relevant blocks found.");
        return;
      }

      console.log(`// Context for: ${query}  (${used} tokens, ${emitted.length} blocks)`);
      console.log();
      for (const { block } of emitted) {
        console.log(block);
        console.log();
      }
    });
}

// ── Scoring ───────────────────────────────────────────────────────────────────

/** Split query into lowercase terms, filtering stop words. */
function tokenize(query: string): string[] {
  const stop = new Set(["a", "an", "the", "to", "for", "in", "of", "and", "or", "is"]);
  return query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 1 && !stop.has(t));
}

/** Score a string against terms — returns number of term hits. */
function scoreText(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  return terms.filter((t) => lower.includes(t)).length;
}

/**
 * Score all blocks in the index against terms.
 * Returns [{name, type, score, file, row}]
 */
function scoreAll(index: WorkspaceIndex, terms: string[]): ScoredCandidate[] {
  const results: ScoredCandidate[] = [];

  const scoreEntry = (name: string, type: string, entry: { note?: string | null; fields?: Array<{ name: string; type: string }>; sources?: string[]; targets?: string[]; file: string; row: number }) => {
    let score = 0;
    score += scoreText(name, terms) * 10;
    if (entry.note) score += scoreText(entry.note, terms) * 2;
    if (entry.fields) {
      for (const f of entry.fields) {
        score += scoreText(f.name, terms) * 5;
        score += scoreText(f.type, terms);
      }
    }
    if (entry.sources) {
      for (const s of entry.sources) score += scoreText(s, terms);
    }
    if (entry.targets) {
      for (const t of entry.targets) score += scoreText(t, terms);
    }
    if (score > 0) {
      results.push({ name, type, score, file: entry.file, row: entry.row });
    }
  };

  for (const [name, e] of index.schemas) scoreEntry(name, "schema", e);
  for (const [name, e] of index.metrics) scoreEntry(name, "metric", e);
  for (const [name, e] of index.mappings) scoreEntry(name, "mapping", e);
  for (const [name, e] of index.fragments) scoreEntry(name, "fragment", e);
  for (const [name, e] of index.transforms) scoreEntry(name, "transform", e);

  // Boost mappings that contain NL backtick refs matching query terms
  if (index.nlRefData) {
    // Group NL ref data by mapping key
    const nlByMapping = new Map<string, typeof index.nlRefData>();
    for (const item of index.nlRefData) {
      const key = item.namespace ? `${item.namespace}::${item.mapping}` : item.mapping;
      if (!nlByMapping.has(key)) nlByMapping.set(key, []);
      nlByMapping.get(key)!.push(item);
    }

    for (const [mappingKey, items] of nlByMapping) {
      // Collect all backtick ref texts for this mapping
      const refTexts: string[] = [];
      for (const item of items) {
        for (const { ref } of extractBacktickRefs(item.text)) {
          refTexts.push(ref);
        }
      }
      if (refTexts.length === 0) continue;

      const nlScore = refTexts.reduce((sum, ref) => sum + scoreText(ref, terms) * 3, 0);
      if (nlScore > 0) {
        const existing = results.find((r) => r.name === mappingKey);
        if (existing) {
          existing.score += nlScore;
        } else {
          const m = index.mappings.get(mappingKey);
          if (m) {
            results.push({ name: mappingKey, type: "mapping", score: nlScore, file: m.file, row: m.row });
          }
        }
      }
    }
  }

  return results;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Render a block as a compact string for output. */
function renderBlock(index: WorkspaceIndex, candidate: ScoredCandidate, compact?: boolean): string {
  const { name, type } = candidate;
  const lines: string[] = [];

  if (type === "schema") {
    const s = index.schemas.get(name);
    const note = s?.note && !compact ? `  (note "${s.note}")` : "";
    lines.push(`schema ${name}${note} {`);
    const maxLen = Math.max(24, ...((s?.fields ?? []).map((f) => f.name.length + 1)));
    for (const f of s?.fields ?? []) lines.push(`  ${f.name.padEnd(maxLen)}${f.type}`);
    lines.push("}");
  } else if (type === "metric") {
    const m = index.metrics.get(name);
    const display = m?.displayName ? ` "${m.displayName}"` : "";
    lines.push(`metric ${name}${display} {`);
    const maxLen = Math.max(20, ...((m?.fields ?? []).map((f) => f.name.length + 1)));
    for (const f of m?.fields ?? []) lines.push(`  ${f.name.padEnd(maxLen)}${f.type}`);
    lines.push("}");
  } else if (type === "mapping") {
    const m = index.mappings.get(name);
    lines.push(`mapping '${name}' {`);
    if (m?.sources?.length) lines.push(`  source { ${m.sources.join(", ")} }`);
    if (m?.targets?.length) lines.push(`  target { ${m.targets.join(", ")} }`);
    lines.push(`  // ${m?.arrowCount ?? 0} arrows`);
    lines.push("}");
  } else if (type === "fragment") {
    const f = index.fragments.get(name);
    lines.push(`fragment '${name}' {`);
    const maxLen = Math.max(24, ...((f?.fields ?? []).map((fld) => fld.name.length + 1)));
    for (const fld of f?.fields ?? []) lines.push(`  ${fld.name.padEnd(maxLen)}${fld.type}`);
    lines.push("}");
  } else if (type === "transform") {
    lines.push(`transform ${name} { ... }`);
  }

  return lines.join("\n");
}
