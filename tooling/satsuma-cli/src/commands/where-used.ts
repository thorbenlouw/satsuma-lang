/**
 * where-used.ts — `satsuma where-used <name>` command
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

import type { Command } from "commander";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex, resolveIndexKey } from "../index-builder.js";
import { resolveAllNLRefs } from "../nl-ref-extract.js";
import type { SyntaxNode, WorkspaceIndex, ParsedFile } from "../types.js";

interface Ref {
  kind: string;
  name: string;
  file: string;
  row?: number;
}

export function register(program: Command): void {
  program
    .command("where-used <name> [path]")
    .description("Find all references to a schema, fragment, or transform")
    .option("--json", "output JSON")
    .addHelpText("after", `
Searches mappings (source/target refs), metrics (source refs), schemas
(fragment spreads, ref metadata), and NL backtick references.

Examples:
  satsuma where-used hub_customer                    # who references this schema?
  satsuma where-used audit_fields                    # where is this fragment spread?
  satsuma where-used trim_and_lower --json           # transform refs as JSON`)
    .action(async (name: string, pathArg: string | undefined, opts: { json?: boolean }) => {
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

      // Determine entity type — resolve namespace-qualified lookups
      const schemaResolved = resolveIndexKey(name, index.schemas);
      const fragmentResolved = resolveIndexKey(name, index.fragments);
      const transformResolved = resolveIndexKey(name, index.transforms);
      const isSchema = schemaResolved != null;
      const isFragment = fragmentResolved != null;
      const isTransform = transformResolved != null;
      const resolvedName = schemaResolved?.key ?? fragmentResolved?.key ?? transformResolved?.key ?? name;

      if (!isSchema && !isFragment && !isTransform) {
        const errorMsg = `'${name}' not found as a schema, fragment, or transform.`;
        const allNames = [
          ...index.schemas.keys(),
          ...index.fragments.keys(),
          ...index.transforms.keys(),
        ];
        const close = allNames.find((k) => k.toLowerCase() === name.toLowerCase());
        if (opts.json) {
          const errorObj: Record<string, unknown> = { error: errorMsg };
          if (close) errorObj.suggestion = close;
          console.log(JSON.stringify(errorObj, null, 2));
        } else {
          console.error(errorMsg);
          if (close) console.error(`Did you mean '${close}'?`);
        }
        process.exit(1);
      }

      const refs = gatherRefs(resolvedName, index, parsedFiles, isSchema, isFragment, isTransform);

      if (opts.json) {
        console.log(JSON.stringify({ name, refs }, null, 2));
        if (refs.length === 0) process.exit(1);
        return;
      }

      if (refs.length === 0) {
        console.log(`No references to '${name}' found.`);
        process.exit(1);
      }

      printDefault(name, refs);
    });
}

// ── Reference gathering ───────────────────────────────────────────────────────

function gatherRefs(name: string, index: WorkspaceIndex, parsedFiles: ParsedFile[], isSchema: boolean, isFragment: boolean, isTransform: boolean): Ref[] {
  const refs: Ref[] = [];

  if (isSchema) {
    // Mappings that use this schema as source or target
    const mappingNames = index.referenceGraph.usedByMappings.get(name) ?? [];
    for (const mname of mappingNames) {
      const m = index.mappings.get(mname);
      refs.push({ kind: "mapping", name: mname, file: m?.file ?? "?", row: (m?.row ?? 0) + 1 });
    }

    // Metrics that reference this schema
    for (const [metricName, sources] of index.referenceGraph.metricsReferences) {
      if (sources.includes(name)) {
        const m = index.metrics.get(metricName);
        refs.push({ kind: "metric", name: metricName, file: m?.file ?? "?", row: (m?.row ?? 0) + 1 });
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

  // Ref metadata references — find (ref schema.field) metadata pointing to this schema
  if (isSchema) {
    for (const [schemaName, schema] of index.schemas) {
      for (const field of schema.fields) {
        if (!field.metadata) continue;
        for (const m of field.metadata) {
          if (m.kind === "kv" && m.key === "ref") {
            const refTarget = m.value.split(".")[0];
            if (refTarget === name || refTarget === name.split("::").pop()) {
              refs.push({ kind: "ref_metadata", name: `${schemaName}.${field.name}`, file: schema.file, row: schema.row + 1 });
            }
          }
        }
      }
    }
  }

  // Import references — find import declarations that reference this name
  for (const { filePath, tree } of parsedFiles) {
    const importRefs = findImportRefs(tree.rootNode, name);
    for (const { path, row } of importRefs) {
      refs.push({ kind: "import", name: path, file: filePath, row });
    }
  }

  // NL backtick references — find references inside NL transform bodies
  const nlRefs = resolveAllNLRefs(index);
  const seenNLRefs = new Set<string>();
  for (const nlRef of nlRefs) {
    if (!nlRef.resolved || !nlRef.resolvedTo) continue;
    const resolvedRefName = nlRef.resolvedTo.name;
    // Match the queried name against the resolved reference
    if (resolvedRefName === name || resolvedRefName.startsWith(name + ".")) {
      const dedup = `${nlRef.mapping}:${nlRef.file}:${nlRef.line}`;
      if (seenNLRefs.has(dedup)) continue;
      seenNLRefs.add(dedup);
      refs.push({
        kind: "nl_ref",
        name: nlRef.mapping,
        file: nlRef.file,
        row: nlRef.line + 1,
      });
    }
  }

  return refs;
}

/**
 * Find all fragment_spread usages of `fragmentName` in the CST.
 * Returns [{block, row}] where block is the containing schema/fragment name.
 */
function findFragmentSpreads(rootNode: SyntaxNode, fragmentName: string): Array<{ block: string; row: number }> {
  const results: Array<{ block: string; row: number }> = [];
  function checkBlock(topLevel: SyntaxNode, namespace: string | null): void {
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

function walkForSpreads(bodyNode: SyntaxNode, fragmentName: string, blockName: string, results: Array<{ block: string; row: number }>): void {
  for (const c of bodyNode.namedChildren) {
    if (c.type === "fragment_spread") {
      // fragment_spread children use spread_label, not block_label
      const lbl = c.namedChildren.find((x) => x.type === "spread_label" || x.type === "block_label");
      let sname = "";
      if (lbl) {
        const q = lbl.namedChildren.find((x) => x.type === "quoted_name");
        if (q) {
          sname = q.text.slice(1, -1);
        } else {
          sname = lbl.namedChildren
            .filter((x) => x.type === "identifier" || x.type === "qualified_name")
            .map((x) => x.text)
            .join(" ");
        }
      }
      if (sname === fragmentName) {
        results.push({ block: blockName, row: c.startPosition.row });
      }
    } else if (c.type === "field_decl") {
      // Recurse into nested record/list_of fields for spreads
      const nested = c.namedChildren.find((x) => x.type === "schema_body");
      if (nested) walkForSpreads(nested, fragmentName, blockName, results);
    }
  }
}

/**
 * Find all transform invocations (token_call) matching `transformName` in mapping arrows.
 * Returns [{mapping, row}] where mapping is the qualified mapping name.
 */
function findTransformRefs(rootNode: SyntaxNode, transformName: string): Array<{ mapping: string; row: number }> {
  const results: Array<{ mapping: string; row: number }> = [];

  function scanMappings(node: SyntaxNode, namespace: string | null): void {
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

function walkForTransformCalls(node: SyntaxNode, transformName: string, mappingName: string, results: Array<{ mapping: string; row: number }>): void {
  for (const c of node.namedChildren) {
    if (c.type === "pipe_step") {
      const inner = c.namedChildren[0];
      if (inner?.type === "token_call" && inner.text === transformName) {
        results.push({ mapping: mappingName, row: c.startPosition.row });
      }
      // Check for fragment_spread inside pipe_step (transform spread: ...name)
      if (inner?.type === "fragment_spread") {
        const lbl = inner.namedChildren.find((x) => x.type === "spread_label");
        const spreadName = getSpreadName(lbl);
        if (spreadName === transformName) {
          results.push({ mapping: mappingName, row: c.startPosition.row });
        }
      }
      // Don't recurse into pipe_step — already checked its children above
      continue;
    }
    walkForTransformCalls(c, transformName, mappingName, results);
  }
}

function getSpreadName(lbl: SyntaxNode | undefined): string {
  if (!lbl) return "";
  const q = lbl.namedChildren.find((x) => x.type === "quoted_name");
  if (q) return q.text.slice(1, -1);
  return lbl.namedChildren
    .filter((x) => x.type === "identifier" || x.type === "qualified_name")
    .map((x) => x.text)
    .join(" ");
}

/**
 * Find import declarations that reference `name` in their import list.
 */
function findImportRefs(rootNode: SyntaxNode, name: string): Array<{ path: string; row: number }> {
  const results: Array<{ path: string; row: number }> = [];
  for (const c of rootNode.namedChildren) {
    if (c.type !== "import_decl") continue;
    // Check each import_name child
    const importedNames: string[] = [];
    for (const child of c.namedChildren) {
      if (child.type === "import_name") {
        // import_name wraps a quoted_name, identifier, or qualified_name
        let text = child.text;
        if (text.startsWith("'") && text.endsWith("'")) text = text.slice(1, -1);
        importedNames.push(text);
      }
    }
    if (importedNames.some((n) => n === name)) {
      const pathNode = c.namedChildren.find((x) => x.type === "import_path");
      const pathStr = pathNode?.namedChildren[0]?.text?.slice(1, -1) ?? pathNode?.text?.slice(1, -1) ?? "";
      results.push({ path: pathStr, row: c.startPosition.row });
    }
  }
  return results;
}

// ── Formatter ─────────────────────────────────────────────────────────────────

function printDefault(name: string, refs: Ref[]): void {
  console.log(`References to '${name}' (${refs.length}):`);
  console.log();

  const byKind = new Map<string, Ref[]>();
  for (const ref of refs) {
    if (!byKind.has(ref.kind)) byKind.set(ref.kind, []);
    byKind.get(ref.kind)!.push(ref);
  }

  const kindLabels: Record<string, string> = {
    mapping: "Used as source/target in mappings",
    metric: "Referenced by metrics",
    fragment_spread: "Spread into schemas/fragments",
    transform_call: "Invoked in mapping transforms",
    nl_ref: "Referenced in NL text",
    ref_metadata: "Referenced via (ref) metadata",
    import: "Imported in",
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
