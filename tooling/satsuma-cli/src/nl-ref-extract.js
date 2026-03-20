/**
 * nl-ref-extract.js — Extract and resolve backtick references from NL strings
 *
 * Parses NL strings inside transform pipe steps for backtick-delimited
 * references (e.g., `source::hr_employees`, `posted_by`), classifies them,
 * and optionally resolves them against a WorkspaceIndex.
 *
 * This module is the shared foundation for validate, lineage, where-used,
 * arrows, context, and the nl-refs command.
 */

// ── Extraction ──────────────────────────────────────────────────────────────

const BACKTICK_RE = /`([^`]+)`/g;

/**
 * Extract backtick-delimited references from a single NL string.
 *
 * @param {string} text  NL string content (delimiters already stripped)
 * @returns {Array<{ref: string, offset: number}>}
 */
export function extractBacktickRefs(text) {
  const refs = [];
  let match;
  BACKTICK_RE.lastIndex = 0;
  while ((match = BACKTICK_RE.exec(text)) !== null) {
    refs.push({ ref: match[1], offset: match.index });
  }
  return refs;
}

// ── Classification ──────────────────────────────────────────────────────────

/**
 * Classify a backtick reference by its syntactic form.
 *
 * @param {string} ref  The reference text (without backticks)
 * @returns {'namespace-qualified-field'|'namespace-qualified-schema'|'dotted-field'|'bare'}
 */
export function classifyRef(ref) {
  if (ref.includes("::")) {
    // ns::name.field or ns::name
    return ref.includes(".") ? "namespace-qualified-field" : "namespace-qualified-schema";
  }
  if (ref.includes(".")) return "dotted-field";
  return "bare";
}

// ── Resolution ──────────────────────────────────────────────────────────────

/**
 * Resolve a single backtick reference against the workspace index.
 *
 * @param {string} ref  The reference text
 * @param {object} mappingContext  {sources: string[], targets: string[], namespace: string|null}
 * @param {object} index  WorkspaceIndex
 * @returns {{resolved: boolean, resolvedTo: {kind: string, name: string}|null}}
 */
export function resolveRef(ref, mappingContext, index) {
  const classification = classifyRef(ref);

  if (classification === "namespace-qualified-schema") {
    // Direct schema lookup
    if (index.schemas.has(ref)) return { resolved: true, resolvedTo: { kind: "schema", name: ref } };
    if (index.fragments?.has(ref)) return { resolved: true, resolvedTo: { kind: "fragment", name: ref } };
    if (index.transforms?.has(ref)) return { resolved: true, resolvedTo: { kind: "transform", name: ref } };
    return { resolved: false, resolvedTo: null };
  }

  if (classification === "namespace-qualified-field") {
    // ns::schema.field
    const dotIdx = ref.indexOf(".", ref.indexOf("::") + 2);
    const schemaRef = ref.slice(0, dotIdx);
    const fieldName = ref.slice(dotIdx + 1);
    const schema = index.schemas.get(schemaRef);
    if (schema && hasField(schema.fields, fieldName)) {
      return { resolved: true, resolvedTo: { kind: "field", name: ref } };
    }
    return { resolved: false, resolvedTo: null };
  }

  if (classification === "dotted-field") {
    // schema.field — check if schema part matches a declared source/target
    const dotIdx = ref.indexOf(".");
    const schemaName = ref.slice(0, dotIdx);
    const fieldName = ref.slice(dotIdx + 1);
    const allSchemas = [...(mappingContext.sources ?? []), ...(mappingContext.targets ?? [])];
    for (const s of allSchemas) {
      const baseName = s.includes("::") ? s.split("::")[1] : s;
      if (baseName === schemaName || s === schemaName) {
        const schema = index.schemas.get(s);
        if (schema && hasField(schema.fields, fieldName)) {
          return { resolved: true, resolvedTo: { kind: "field", name: `${s}.${fieldName}` } };
        }
      }
    }
    return { resolved: false, resolvedTo: null };
  }

  // Bare identifier — check fields in declared sources/targets, then schemas/transforms
  const allSchemaNames = [...(mappingContext.sources ?? []), ...(mappingContext.targets ?? [])];
  for (const s of allSchemaNames) {
    const schema = index.schemas.get(s);
    if (schema && hasField(schema.fields, ref)) {
      return { resolved: true, resolvedTo: { kind: "field", name: `${s}.${ref}` } };
    }
  }

  // Check if it's a schema, fragment, or transform name
  if (index.schemas.has(ref)) return { resolved: true, resolvedTo: { kind: "schema", name: ref } };
  if (index.fragments?.has(ref)) return { resolved: true, resolvedTo: { kind: "fragment", name: ref } };
  if (index.transforms?.has(ref)) return { resolved: true, resolvedTo: { kind: "transform", name: ref } };

  // Try namespace-qualified lookup from mapping's namespace
  if (mappingContext.namespace) {
    const nsRef = `${mappingContext.namespace}::${ref}`;
    if (index.schemas.has(nsRef)) return { resolved: true, resolvedTo: { kind: "schema", name: nsRef } };
    if (index.transforms?.has(nsRef)) return { resolved: true, resolvedTo: { kind: "transform", name: nsRef } };
  }

  return { resolved: false, resolvedTo: null };
}

/**
 * Check if a field tree contains a field with the given name (flat or nested).
 */
function hasField(fields, name) {
  for (const f of fields) {
    if (f.name === name) return true;
    if (f.children && hasField(f.children, name)) return true;
  }
  return false;
}

// ── CST Walking (for extractFileData integration) ───────────────────────────

/**
 * Extract NL ref data from a CST root node. Called during extractFileData()
 * while the tree is still valid.
 *
 * @param {object} rootNode  tree-sitter root node
 * @returns {Array<{text: string, mapping: string|null, namespace: string|null,
 *                   targetField: string|null, line: number, column: number}>}
 */
export function extractNLRefData(rootNode) {
  const results = [];
  walkMappings(rootNode, null, results);
  return results;
}

function walkMappings(node, namespace, results) {
  for (const c of node.namedChildren) {
    if (c.type === "namespace_block") {
      const nsName = c.namedChildren.find((x) => x.type === "identifier");
      walkMappings(c, nsName?.text ?? null, results);
    } else if (c.type === "mapping_block") {
      extractMappingNLRefs(c, namespace, results);
    }
  }
}

function extractMappingNLRefs(mappingNode, namespace, results) {
  const lbl = mappingNode.namedChildren.find((c) => c.type === "block_label");
  const inner = lbl?.namedChildren[0];
  let mappingName = inner?.text ?? null;
  if (inner?.type === "quoted_name") mappingName = mappingName.slice(1, -1);

  const body = mappingNode.namedChildren.find((c) => c.type === "mapping_body");
  if (!body) return;

  walkArrowsForNL(body, mappingName, namespace, null, results);
}

function walkArrowsForNL(node, mappingName, namespace, targetField, results) {
  for (const c of node.namedChildren) {
    if (c.type === "map_arrow" || c.type === "computed_arrow" || c.type === "nested_arrow") {
      // Get target field for this arrow
      const tgtNode = c.namedChildren.find((x) => x.type === "tgt_path");
      const tgt = extractPathText(tgtNode) ?? targetField;

      const pipeChain = c.namedChildren.find((x) => x.type === "pipe_chain");
      if (pipeChain) {
        for (const step of pipeChain.namedChildren) {
          if (step.type === "pipe_step") {
            const innerNode = step.namedChildren[0];
            if (innerNode && (innerNode.type === "nl_string" || innerNode.type === "multiline_string")) {
              const text = innerNode.type === "multiline_string"
                ? innerNode.text.slice(3, -3).trim()
                : innerNode.text.slice(1, -1);
              // Only include if text contains backtick refs
              if (text.includes("`")) {
                results.push({
                  text,
                  mapping: mappingName,
                  namespace,
                  targetField: tgt,
                  line: innerNode.startPosition.row,
                  column: innerNode.startPosition.column,
                });
              }
            }
          }
        }
      }

      // Recurse into nested arrows
      walkArrowsForNL(c, mappingName, namespace, tgt, results);
    }
  }
}

function extractPathText(pathNode) {
  if (!pathNode) return null;
  const inner = pathNode.namedChildren[0];
  if (!inner) return pathNode.text;
  if (inner.type === "backtick_path") return inner.text.slice(1, -1);
  return inner.text;
}

// ── High-level extraction ───────────────────────────────────────────────────

/**
 * Process pre-extracted NL ref data into fully resolved reference records.
 *
 * @param {object} index  WorkspaceIndex (must have nlRefData populated)
 * @returns {Array<{ref, classification, resolved, resolvedTo, mapping, namespace,
 *                   targetField, file, line, column}>}
 */
export function resolveAllNLRefs(index) {
  const results = [];
  const nlRefData = index.nlRefData ?? [];

  for (const item of nlRefData) {
    const backtickRefs = extractBacktickRefs(item.text);
    const mappingKey = item.namespace
      ? `${item.namespace}::${item.mapping}`
      : item.mapping;
    const mapping = index.mappings.get(mappingKey);
    const mappingContext = {
      sources: mapping?.sources ?? [],
      targets: mapping?.targets ?? [],
      namespace: item.namespace,
    };

    for (const { ref, offset } of backtickRefs) {
      const classification = classifyRef(ref);
      const resolution = resolveRef(ref, mappingContext, index);

      results.push({
        ref,
        classification,
        resolved: resolution.resolved,
        resolvedTo: resolution.resolvedTo,
        mapping: mappingKey,
        namespace: item.namespace,
        targetField: item.targetField,
        file: item.file,
        line: item.line,
        column: item.column + offset,
      });
    }
  }

  return results;
}

/**
 * Check if a schema reference from an NL block is declared in the mapping's
 * source or target list.
 *
 * @param {string} schemaRef  Namespace-qualified schema name
 * @param {object} mapping  Mapping entry from index
 * @returns {boolean}
 */
export function isSchemaInMappingSources(schemaRef, mapping) {
  if (!mapping) return false;
  const allRefs = [...(mapping.sources ?? []), ...(mapping.targets ?? [])];
  return allRefs.includes(schemaRef);
}
