/**
 * where-used.js — `stm where-used <name>` command
 *
 * Finds all references to a schema, fragment, or transform by name.
 *
 * Schema references:   via referenceGraph.usedByMappings + metricsReferences
 * Fragment references: via CST fragment_spread nodes across all files
 * Transform refs:      not currently cross-referenced in CST (reported as such)
 *
 * Output is grouped by usage type (mapping, metric, schema).
 *
 * Flags:
 *   --json  structured JSON
 */

import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { resolveAllNLRefs } from "../nl-ref-extract.js";

/** @param {import('commander').Command} program */
export function register(program) {
  program
    .command("where-used <name> [path]")
    .description("Find all references to a schema, fragment, or transform")
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

      // Determine entity type — resolve namespace-qualified lookups
      const schemaResolved = resolveIndexKey(name, index.schemas);
      const fragmentResolved = resolveIndexKey(name, index.fragments);
      const transformResolved = resolveIndexKey(name, index.transforms);
      const isSchema = schemaResolved != null;
      const isFragment = fragmentResolved != null;
      const isTransform = transformResolved != null;
      const resolvedName = schemaResolved?.key ?? fragmentResolved?.key ?? transformResolved?.key ?? name;

      if (!isSchema && !isFragment && !isTransform) {
        console.error(`'${name}' not found as a schema, fragment, or transform.`);
        const allNames = [
          ...index.schemas.keys(),
          ...index.fragments.keys(),
          ...index.transforms.keys(),
        ];
        const close = allNames.find((k) => k.toLowerCase() === name.toLowerCase());
        if (close) console.error(`Did you mean '${close}'?`);
        process.exit(1);
      }

      const refs = gatherRefs(resolvedName, index, parsedFiles, isSchema, isFragment, isTransform);

      if (opts.json) {
        console.log(JSON.stringify({ name, refs }, null, 2));
        return;
      }

      if (refs.length === 0) {
        console.log(`No references to '${name}' found.`);
        return;
      }

      printDefault(name, refs);
    });
}

// ── Reference gathering ───────────────────────────────────────────────────────

/**
 * @typedef {Object} Ref
 * @property {string} kind   mapping|metric|schema|fragment
 * @property {string} name   the referencing entity name
 * @property {string} file
 * @property {number} [row]
 */

function gatherRefs(name, index, parsedFiles, isSchema, isFragment, isTransform) {
  const refs = [];

  if (isSchema) {
    // Mappings that use this schema as source or target
    const mappingNames = index.referenceGraph.usedByMappings.get(name) ?? [];
    for (const mname of mappingNames) {
      const m = index.mappings.get(mname);
      refs.push({ kind: "mapping", name: mname, file: m?.file ?? "?", row: m?.row });
    }

    // Metrics that reference this schema
    for (const [metricName, sources] of index.referenceGraph.metricsReferences) {
      if (sources.includes(name)) {
        const m = index.metrics.get(metricName);
        refs.push({ kind: "metric", name: metricName, file: m?.file ?? "?", row: m?.row });
      }
    }
  }

  if (isFragment) {
    // Find fragment_spread nodes across all files
    for (const { filePath, tree } of parsedFiles) {
      const spreads = findFragmentSpreads(tree.rootNode, name);
      for (const { block, row } of spreads) {
        refs.push({ kind: "fragment_spread", name: block, file: filePath, row });
      }
    }
  }

  if (isTransform) {
    // Find transform invocations in arrow pipe chains
    for (const { filePath, tree } of parsedFiles) {
      const transformRefs = findTransformRefs(tree.rootNode, name);
      for (const { mapping, row } of transformRefs) {
        refs.push({ kind: "transform_call", name: mapping, file: filePath, row });
      }
    }
  }

  // NL backtick references — find references inside NL transform bodies
  const nlRefs = resolveAllNLRefs(index);
  const seenNLRefs = new Set();
  for (const nlRef of nlRefs) {
    if (!nlRef.resolved || !nlRef.resolvedTo) continue;
    const resolvedName = nlRef.resolvedTo.name;
    // Match the queried name against the resolved reference
    if (resolvedName === name || resolvedName.startsWith(name + ".")) {
      const dedup = `${nlRef.mapping}:${nlRef.file}:${nlRef.line}`;
      if (seenNLRefs.has(dedup)) continue;
      seenNLRefs.add(dedup);
      refs.push({
        kind: "nl_ref",
        name: nlRef.mapping,
        file: nlRef.file,
        row: nlRef.line,
      });
    }
  }

  return refs;
}

/**
 * Find all fragment_spread usages of `fragmentName` in the CST.
 * Returns [{block, row}] where block is the containing schema/fragment name.
 */
function findFragmentSpreads(rootNode, fragmentName) {
  const results = [];
  function checkBlock(topLevel, namespace) {
    if (topLevel.type !== "schema_block" && topLevel.type !== "fragment_block") return;
    const lbl = topLevel.namedChildren.find((c) => c.type === "block_label");
    const inner = lbl?.namedChildren[0];
    let blockName = inner?.text ?? "";
    if (inner?.type === "quoted_name") blockName = blockName.slice(1, -1);
    if (namespace) blockName = `${namespace}::${blockName}`;

    const body = topLevel.namedChildren.find((c) => c.type === "schema_body");
    if (body) {
      walkForSpreads(body, fragmentName, blockName, results);
    }
  }
  for (const topLevel of rootNode.namedChildren) {
    checkBlock(topLevel, null);
    if (topLevel.type === "namespace_block") {
      const nsName = topLevel.namedChildren.find((c) => c.type === "identifier");
      const ns = nsName?.text ?? null;
      for (const inner of topLevel.namedChildren) {
        checkBlock(inner, ns);
      }
    }
  }
  return results;
}

function walkForSpreads(bodyNode, fragmentName, blockName, results) {
  for (const c of bodyNode.namedChildren) {
    if (c.type === "fragment_spread") {
      // fragment_spread children use spread_label, not block_label
      const lbl = c.namedChildren.find((x) => x.type === "spread_label" || x.type === "block_label");
      let sname = lbl?.text ?? "";
      if (sname === fragmentName) {
        results.push({ block: blockName, row: c.startPosition.row });
      }
    } else if (c.type === "record_block" || c.type === "list_block") {
      const nested = c.namedChildren.find((x) => x.type === "schema_body");
      if (nested) walkForSpreads(nested, fragmentName, blockName, results);
    }
  }
}

/**
 * Find all transform invocations (token_call) matching `transformName` in mapping arrows.
 * Returns [{mapping, row}] where mapping is the qualified mapping name.
 */
function findTransformRefs(rootNode, transformName) {
  const results = [];

  function scanMappings(node, namespace) {
    for (const c of node.namedChildren) {
      if (c.type === "namespace_block") {
        const nsName = c.namedChildren.find((x) => x.type === "identifier");
        scanMappings(c, nsName?.text ?? null);
        continue;
      }
      if (c.type !== "mapping_block") continue;

      const lbl = c.namedChildren.find((x) => x.type === "block_label");
      const inner = lbl?.namedChildren[0];
      let mappingName = inner?.text ?? "";
      if (inner?.type === "quoted_name") mappingName = mappingName.slice(1, -1);
      if (namespace) mappingName = `${namespace}::${mappingName}`;

      // Walk all pipe_step/token_call descendants
      walkForTransformCalls(c, transformName, mappingName, results);
    }
  }

  scanMappings(rootNode, null);
  return results;
}

function walkForTransformCalls(node, transformName, mappingName, results) {
  for (const c of node.namedChildren) {
    if (c.type === "pipe_step") {
      const inner = c.namedChildren[0];
      if (inner?.type === "token_call" && inner.text === transformName) {
        results.push({ mapping: mappingName, row: c.startPosition.row });
      }
    }
    walkForTransformCalls(c, transformName, mappingName, results);
  }
}

// ── Formatter ─────────────────────────────────────────────────────────────────

function printDefault(name, refs) {
  console.log(`References to '${name}' (${refs.length}):`);
  console.log();

  const byKind = new Map();
  for (const ref of refs) {
    if (!byKind.has(ref.kind)) byKind.set(ref.kind, []);
    byKind.get(ref.kind).push(ref);
  }

  const kindLabels = {
    mapping: "Used as source/target in mappings",
    metric: "Referenced by metrics",
    fragment_spread: "Spread into schemas/fragments",
    transform_call: "Invoked in mapping transforms",
    nl_ref: "Referenced in NL transform bodies",
  };

  for (const [kind, kindRefs] of byKind) {
    console.log(`${kindLabels[kind] ?? kind} (${kindRefs.length}):`);
    for (const ref of kindRefs) {
      const row = ref.row !== undefined ? `:${ref.row + 1}` : "";
      console.log(`  ${ref.name}  ${ref.file}${row}`);
    }
    console.log();
  }
}
