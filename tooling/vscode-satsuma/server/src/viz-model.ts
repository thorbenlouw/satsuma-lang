import type { SyntaxNode, Tree } from "./parser-utils";
import { nodeRange, child, children, labelText, stringText } from "./parser-utils";
import type { WorkspaceIndex } from "./workspace-index";
import { findReferences, resolveDefinition } from "./workspace-index";

// ---------- VizModel interfaces ----------

export interface VizModel {
  uri: string;
  fileNotes: NoteBlock[];
  namespaces: NamespaceGroup[];
}

export interface NamespaceGroup {
  name: string | null;
  schemas: SchemaCard[];
  mappings: MappingBlock[];
  metrics: MetricCard[];
  fragments: FragmentCard[];
}

export interface SchemaCard {
  id: string;
  qualifiedId: string;
  kind: "schema" | "inline";
  label: string | null;
  fields: FieldEntry[];
  notes: NoteBlock[];
  comments: CommentEntry[];
  metadata: MetadataEntry[];
  location: SourceLocation;
  hasExternalLineage: boolean;
  spreads: string[];
}

export interface FieldEntry {
  name: string;
  type: string;
  constraints: string[];
  notes: NoteBlock[];
  comments: CommentEntry[];
  children: FieldEntry[];
  location: SourceLocation;
}

export interface MappingBlock {
  id: string;
  sourceRefs: string[];
  targetRef: string;
  arrows: ArrowEntry[];
  eachBlocks: EachBlock[];
  flattenBlocks: FlattenBlock[];
  sourceBlock: SourceBlockInfo | null;
  notes: NoteBlock[];
  comments: CommentEntry[];
  location: SourceLocation;
}

export interface ArrowEntry {
  sourceFields: string[];
  targetField: string;
  transform: TransformInfo | null;
  metadata: MetadataEntry[];
  comments: CommentEntry[];
  location: SourceLocation;
}

export interface TransformInfo {
  kind: "pipeline" | "nl" | "mixed" | "map";
  text: string;
  steps: string[];
  nlText: string | null;
}

export interface EachBlock {
  sourceField: string;
  targetField: string;
  arrows: ArrowEntry[];
  nestedEach: EachBlock[];
  location: SourceLocation;
}

export interface FlattenBlock {
  sourceField: string;
  arrows: ArrowEntry[];
  location: SourceLocation;
}

export interface MetricCard {
  id: string;
  qualifiedId: string;
  label: string | null;
  source: string[];
  grain: string | null;
  slices: string[];
  filter: string | null;
  fields: MetricFieldEntry[];
  notes: NoteBlock[];
  comments: CommentEntry[];
  location: SourceLocation;
}

export interface MetricFieldEntry {
  name: string;
  type: string;
  measure: "additive" | "non_additive" | "semi_additive" | null;
  notes: NoteBlock[];
  location: SourceLocation;
}

export interface FragmentCard {
  id: string;
  fields: FieldEntry[];
  notes: NoteBlock[];
  location: SourceLocation;
}

export interface NoteBlock {
  text: string;
  isMultiline: boolean;
  location: SourceLocation;
}

export interface CommentEntry {
  kind: "warning" | "question";
  text: string;
  location: SourceLocation;
}

export interface MetadataEntry {
  key: string;
  value: string;
}

export interface SourceBlockInfo {
  schemas: string[];
  joinDescription: string | null;
  filters: string[];
}

export interface SourceLocation {
  uri: string;
  line: number;
  character: number;
}

// ---------- Known constraint tags ----------

const CONSTRAINT_TAGS = new Set([
  "pk", "required", "pii", "indexed", "unique", "encrypt",
]);

// ---------- VizModel builder ----------

export function buildVizModel(
  uri: string,
  tree: Tree,
  wsIndex: WorkspaceIndex,
): VizModel {
  const root = tree.rootNode;
  const fileNotes: NoteBlock[] = [];
  const globalNs: NamespaceGroup = {
    name: null,
    schemas: [],
    mappings: [],
    metrics: [],
    fragments: [],
  };
  const namespaceMap = new Map<string, NamespaceGroup>();

  for (const node of root.namedChildren) {
    if (node.type === "note_block") {
      fileNotes.push(extractNoteBlock(uri, node));
    } else if (node.type === "namespace_block") {
      const nsName = node.childForFieldName("name")?.text ?? null;
      if (nsName) {
        const nsGroup = getOrCreateNamespace(namespaceMap, nsName);
        processNamespaceChildren(uri, node, nsGroup, nsName, wsIndex);
      }
    } else {
      processTopLevelBlock(uri, node, globalNs, null, wsIndex);
    }
  }

  // Also collect warning/question comments that are siblings of top-level blocks
  collectTopLevelComments(uri, root, globalNs, namespaceMap);

  const namespaces: NamespaceGroup[] = [];
  if (
    globalNs.schemas.length > 0 ||
    globalNs.mappings.length > 0 ||
    globalNs.metrics.length > 0 ||
    globalNs.fragments.length > 0
  ) {
    namespaces.push(globalNs);
  }
  for (const ns of namespaceMap.values()) {
    namespaces.push(ns);
  }

  return { uri, fileNotes, namespaces };
}

// ---------- Top-level processing ----------

function getOrCreateNamespace(
  map: Map<string, NamespaceGroup>,
  name: string,
): NamespaceGroup {
  let ns = map.get(name);
  if (!ns) {
    ns = { name, schemas: [], mappings: [], metrics: [], fragments: [] };
    map.set(name, ns);
  }
  return ns;
}

function processNamespaceChildren(
  uri: string,
  nsNode: SyntaxNode,
  group: NamespaceGroup,
  namespace: string,
  wsIndex: WorkspaceIndex,
): void {
  for (const ch of nsNode.namedChildren) {
    processTopLevelBlock(uri, ch, group, namespace, wsIndex);
  }
}

function processTopLevelBlock(
  uri: string,
  node: SyntaxNode,
  group: NamespaceGroup,
  namespace: string | null,
  wsIndex: WorkspaceIndex,
): void {
  switch (node.type) {
    case "schema_block":
      group.schemas.push(extractSchema(uri, node, namespace, wsIndex));
      break;
    case "fragment_block":
      group.fragments.push(extractFragment(uri, node));
      break;
    case "mapping_block":
      group.mappings.push(extractMapping(uri, node, namespace, wsIndex));
      break;
    case "metric_block":
      group.metrics.push(extractMetric(uri, node, namespace));
      break;
  }
}

/**
 * Collect warning_comment and question_comment nodes that appear as siblings
 * of top-level blocks. Attach them to the preceding schema/mapping/etc.
 */
function collectTopLevelComments(
  uri: string,
  root: SyntaxNode,
  globalNs: NamespaceGroup,
  _namespaceMap: Map<string, NamespaceGroup>,
): void {
  const allNodes = root.children;
  for (let i = 0; i < allNodes.length; i++) {
    const node = allNodes[i]!;
    if (node.type !== "warning_comment" && node.type !== "question_comment") {
      continue;
    }
    const entry: CommentEntry = {
      kind: node.type === "warning_comment" ? "warning" : "question",
      text: extractCommentText(node),
      location: nodeLocation(uri, node),
    };

    // Attach to the nearest preceding schema/mapping/metric/fragment
    const target = findPrecedingBlock(allNodes, i, globalNs);
    if (target) {
      target.push(entry);
    }
  }
}

function findPrecedingBlock(
  allNodes: SyntaxNode[],
  commentIndex: number,
  globalNs: NamespaceGroup,
): CommentEntry[] | null {
  // Walk backwards from the comment to find the preceding block
  for (let j = commentIndex - 1; j >= 0; j--) {
    const prev = allNodes[j]!;
    if (prev.type === "schema_block") {
      const name = labelText(prev);
      const schema = globalNs.schemas.find((s) => s.id === name);
      if (schema) return schema.comments;
    }
    if (prev.type === "mapping_block") {
      const name = labelText(prev);
      const mapping = globalNs.mappings.find((m) => m.id === name);
      if (mapping) return mapping.comments;
    }
    if (prev.type === "metric_block") {
      const name = labelText(prev);
      const metric = globalNs.metrics.find((m) => m.id === name);
      if (metric) return metric.comments;
    }
    if (prev.type === "fragment_block") {
      const name = labelText(prev);
      const frag = globalNs.fragments.find((f) => f.id === name);
      if (frag) return frag.notes as unknown as CommentEntry[];
    }
  }
  return null;
}

function extractCommentText(node: SyntaxNode): string {
  // warning_comment = "//! text", question_comment = "//? text"
  const text = node.text;
  if (text.startsWith("//!") || text.startsWith("//?")) {
    return text.slice(3).trim();
  }
  return text.slice(2).trim();
}

// ---------- Schema extraction ----------

function extractSchema(
  uri: string,
  node: SyntaxNode,
  namespace: string | null,
  wsIndex: WorkspaceIndex,
): SchemaCard {
  const name = labelText(node) ?? "unknown";
  const qualifiedId = namespace ? `${namespace}::${name}` : name;
  const body = child(node, "schema_body");
  const meta = child(node, "metadata_block");

  return {
    id: name,
    qualifiedId,
    kind: "schema",
    label: extractSchemaLabel(meta),
    fields: body ? extractFieldEntries(uri, body) : [],
    notes: extractNotes(uri, node),
    comments: extractComments(uri, node),
    metadata: meta ? extractMetadataEntries(meta) : [],
    location: nodeLocation(uri, node),
    hasExternalLineage: checkExternalLineage(qualifiedId, uri, wsIndex),
    spreads: body ? extractSpreads(body) : [],
  };
}

function extractSpreads(body: SyntaxNode): string[] {
  const spreads: string[] = [];
  for (const spreadNode of children(body, "spread_statement")) {
    const name = labelText(spreadNode) ?? child(spreadNode, "identifier")?.text;
    if (name) spreads.push(name);
  }
  return spreads;
}

function extractSchemaLabel(meta: SyntaxNode | null): string | null {
  if (!meta) return null;
  // In the CST, note tags appear as note_tag nodes (not tag_with_value)
  for (const ch of meta.namedChildren) {
    if (ch.type === "note_tag") {
      const str = child(ch, "nl_string") ?? child(ch, "multiline_string");
      return str ? stringText(str) : null;
    }
    // Also handle tag_with_value form (e.g., note "desc")
    if (ch.type === "tag_with_value") {
      const key = ch.namedChildren[0];
      if (key?.text === "note") {
        const val = ch.namedChildren[1];
        return val ? stripQuotes(val.text) : null;
      }
    }
  }
  return null;
}

function checkExternalLineage(
  qualifiedId: string,
  currentUri: string,
  wsIndex: WorkspaceIndex,
): boolean {
  const refs = findReferences(wsIndex, qualifiedId);
  return refs.some((r) => r.uri !== currentUri);
}

// ---------- Fragment extraction ----------

function extractFragment(uri: string, node: SyntaxNode): FragmentCard {
  const name = labelText(node) ?? "unknown";
  const body = child(node, "schema_body");

  return {
    id: name,
    fields: body ? extractFieldEntries(uri, body) : [],
    notes: extractNotes(uri, node),
    location: nodeLocation(uri, node),
  };
}

// ---------- Field extraction ----------

function extractFieldEntries(uri: string, body: SyntaxNode): FieldEntry[] {
  const fields: FieldEntry[] = [];
  for (const fieldNode of children(body, "field_decl")) {
    const entry = extractSingleField(uri, fieldNode);
    if (entry) fields.push(entry);
  }
  return fields;
}

function extractSingleField(
  uri: string,
  fieldNode: SyntaxNode,
): FieldEntry | null {
  const nameNode = child(fieldNode, "field_name");
  if (!nameNode) return null;

  const name = fieldNameText(nameNode);
  if (!name) return null;

  const typeExpr = child(fieldNode, "type_expr");
  const nestedBody = child(fieldNode, "schema_body");
  const isList = fieldNode.children.some((c) => c.type === "list_of");
  const isRecord = fieldNode.children.some((c) => c.type === "record");

  let type = "";
  if (isList && isRecord) type = "list_of record";
  else if (isRecord) type = "record";
  else if (isList && typeExpr) type = `list_of ${typeExpr.text}`;
  else if (typeExpr) type = typeExpr.text;

  const meta = child(fieldNode, "metadata_block");
  const constraints = meta ? extractConstraints(meta) : [];

  return {
    name,
    type,
    constraints,
    notes: extractNotes(uri, fieldNode),
    comments: extractComments(uri, fieldNode),
    children: nestedBody ? extractFieldEntries(uri, nestedBody) : [],
    location: nodeLocation(uri, nameNode),
  };
}

function extractConstraints(meta: SyntaxNode): string[] {
  const constraints: string[] = [];
  for (const ch of meta.namedChildren) {
    // CST uses tag_token for bare constraint tags like pk, required, pii
    if (ch.type === "tag_token") {
      // tag_token may contain an identifier child
      const text = ch.namedChildren[0]?.text ?? ch.text;
      if (CONSTRAINT_TAGS.has(text)) {
        constraints.push(text);
      }
    }
    // Also handle tag_with_value (e.g., default USD — not a constraint, but pk/required could appear here)
    if (ch.type === "tag_with_value") {
      const key = ch.namedChildren[0];
      if (key && CONSTRAINT_TAGS.has(key.text)) {
        constraints.push(key.text);
      }
    }
  }
  return constraints;
}

// ---------- Mapping extraction ----------

function resolveMappingRef(
  refName: string,
  namespace: string | null,
  wsIndex: WorkspaceIndex,
): string {
  const defs = resolveDefinition(wsIndex, refName, namespace);
  const schemaDef = defs.find((d) => d.kind === "schema");
  return schemaDef ? (namespace && !refName.includes("::") && schemaDef.namespace
    ? `${schemaDef.namespace}::${refName}`
    : refName.includes("::")
      ? refName
      : schemaDef.namespace
        ? `${schemaDef.namespace}::${refName}`
        : refName)
    : refName;
}

function extractMapping(
  uri: string,
  node: SyntaxNode,
  namespace: string | null,
  wsIndex: WorkspaceIndex,
): MappingBlock {
  const name = labelText(node) ?? "unknown";
  const body = child(node, "mapping_body");

  const sourceRefs: string[] = [];
  const arrows: ArrowEntry[] = [];
  const eachBlocks: EachBlock[] = [];
  const flattenBlocks: FlattenBlock[] = [];
  let sourceBlock: SourceBlockInfo | null = null;
  let targetRef = "";
  const notes: NoteBlock[] = [];

  if (body) {
    for (const ch of body.namedChildren) {
      switch (ch.type) {
        case "source_block":
          sourceBlock = extractSourceBlock(ch);
          if (sourceBlock.schemas.length > 0) {
            const resolvedSchemas = sourceBlock.schemas.map((ref) =>
              resolveMappingRef(ref, namespace, wsIndex)
            );
            sourceBlock = { ...sourceBlock, schemas: resolvedSchemas };
            sourceRefs.push(...resolvedSchemas);
          }
          break;
        case "target_block":
          for (const ref of children(ch, "source_ref")) {
            const refName = sourceRefText(ref);
            if (refName) targetRef = resolveMappingRef(refName, namespace, wsIndex);
          }
          break;
        case "map_arrow":
          arrows.push(extractArrow(uri, ch));
          break;
        case "computed_arrow":
          arrows.push(extractComputedArrow(uri, ch));
          break;
        case "each_block":
          eachBlocks.push(extractEachBlock(uri, ch));
          break;
        case "flatten_block":
          flattenBlocks.push(extractFlattenBlock(uri, ch));
          break;
        case "note_block":
          notes.push(extractNoteBlock(uri, ch));
          break;
      }
    }
  }

  // Also collect notes from the mapping block itself (outside mapping_body)
  for (const ch of node.namedChildren) {
    if (ch.type === "note_block") {
      notes.push(extractNoteBlock(uri, ch));
    }
  }

  return {
    id: name,
    sourceRefs,
    targetRef,
    arrows,
    eachBlocks,
    flattenBlocks,
    sourceBlock,
    notes,
    comments: extractComments(uri, node),
    location: nodeLocation(uri, node),
  };
}

function extractSourceBlock(node: SyntaxNode): SourceBlockInfo {
  const schemas: string[] = [];
  let joinDescription: string | null = null;
  const filters: string[] = [];

  for (const ch of node.namedChildren) {
    if (ch.type === "source_ref") {
      // An NL string inside a source_ref is a join description, not a schema name
      const nlChild = child(ch, "nl_string") ?? child(ch, "multiline_string");
      if (nlChild && !child(ch, "identifier") && !child(ch, "backtick_name") && !child(ch, "qualified_name")) {
        joinDescription = stringText(nlChild);
      } else {
        const name = sourceRefText(ch);
        if (name) schemas.push(name);
      }
    } else if (ch.type === "nl_string" || ch.type === "multiline_string") {
      joinDescription = stringText(ch);
    }
  }

  return { schemas, joinDescription, filters };
}

function extractArrow(uri: string, node: SyntaxNode): ArrowEntry {
  const srcPaths = children(node, "src_path");
  const tgtPath = child(node, "tgt_path");
  const pipeChain = child(node, "pipe_chain");
  const meta = child(node, "metadata_block");

  const sourceFields = srcPaths.map((sp) => pathText(sp));
  const targetField = tgtPath ? pathText(tgtPath) : "";

  return {
    sourceFields,
    targetField,
    transform: pipeChain ? extractTransform(pipeChain) : null,
    metadata: meta ? extractMetadataEntries(meta) : [],
    comments: extractComments(uri, node),
    location: nodeLocation(uri, node),
  };
}

function extractComputedArrow(uri: string, node: SyntaxNode): ArrowEntry {
  const tgtPath = child(node, "tgt_path");
  const pipeChain = child(node, "pipe_chain");
  const meta = child(node, "metadata_block");

  return {
    sourceFields: [],
    targetField: tgtPath ? pathText(tgtPath) : "",
    transform: pipeChain ? extractTransform(pipeChain) : null,
    metadata: meta ? extractMetadataEntries(meta) : [],
    comments: extractComments(uri, node),
    location: nodeLocation(uri, node),
  };
}

function extractTransform(pipeChain: SyntaxNode): TransformInfo {
  let nlText: string | null = null;
  let hasNl = false;
  let hasPipeline = false;
  let hasMap = false;
  const steps: string[] = [];

  for (const step of children(pipeChain, "pipe_step")) {
    // Each pipe_step contains pipe_text or map_literal
    const mapLit = child(step, "map_literal");
    if (mapLit) {
      hasMap = true;
      continue;
    }

    const pipeText = child(step, "pipe_text");
    if (pipeText) {
      // pipe_text can contain nl_string, identifier, or func_call
      const nl = child(pipeText, "nl_string") ?? child(pipeText, "multiline_string");
      if (nl) {
        hasNl = true;
        nlText = stringText(nl);
      } else {
        hasPipeline = true;
        steps.push(pipeText.text);
      }
    }
  }

  let kind: TransformInfo["kind"];
  if (hasMap) kind = "map";
  else if (hasNl && hasPipeline) kind = "mixed";
  else if (hasNl) kind = "nl";
  else kind = "pipeline";

  return {
    kind,
    text: pipeChain.text,
    steps,
    nlText,
  };
}

function extractEachBlock(uri: string, node: SyntaxNode): EachBlock {
  const srcPath = child(node, "src_path");
  const tgtPath = child(node, "tgt_path");
  const arrows: ArrowEntry[] = [];
  const nestedEach: EachBlock[] = [];

  for (const ch of node.namedChildren) {
    if (ch.type === "map_arrow") {
      arrows.push(extractArrow(uri, ch));
    } else if (ch.type === "computed_arrow") {
      arrows.push(extractComputedArrow(uri, ch));
    } else if (ch.type === "each_block") {
      nestedEach.push(extractEachBlock(uri, ch));
    }
  }

  return {
    sourceField: srcPath ? pathText(srcPath) : "",
    targetField: tgtPath ? pathText(tgtPath) : "",
    arrows,
    nestedEach,
    location: nodeLocation(uri, node),
  };
}

function extractFlattenBlock(uri: string, node: SyntaxNode): FlattenBlock {
  const srcPath = child(node, "src_path");
  const arrows: ArrowEntry[] = [];

  for (const ch of node.namedChildren) {
    if (ch.type === "map_arrow") {
      arrows.push(extractArrow(uri, ch));
    } else if (ch.type === "computed_arrow") {
      arrows.push(extractComputedArrow(uri, ch));
    }
  }

  return {
    sourceField: srcPath ? pathText(srcPath) : "",
    arrows,
    location: nodeLocation(uri, node),
  };
}

// ---------- Metric extraction ----------

function extractMetric(
  uri: string,
  node: SyntaxNode,
  namespace: string | null,
): MetricCard {
  const name = labelText(node) ?? "unknown";
  const qualifiedId = namespace ? `${namespace}::${name}` : name;
  const meta = child(node, "metadata_block");
  const body = child(node, "metric_body") ?? child(node, "schema_body");

  // Extract label from the first string literal after the block_label
  let label: string | null = null;
  for (const ch of node.namedChildren) {
    if (ch.type === "nl_string") {
      label = stringText(ch);
      break;
    }
    if (ch.type === "metadata_block" || ch.type === "metric_body" || ch.type === "schema_body") {
      break;
    }
  }

  const source: string[] = [];
  let grain: string | null = null;
  const slices: string[] = [];
  let filter: string | null = null;

  if (meta) {
    extractMetricMetadata(meta, source, slices, (g) => (grain = g), (f) => (filter = f));
  }

  return {
    id: name,
    qualifiedId,
    label,
    source,
    grain,
    slices,
    filter,
    fields: body ? extractMetricFields(uri, body) : [],
    notes: extractNotes(uri, node),
    comments: extractComments(uri, node),
    location: nodeLocation(uri, node),
  };
}

function extractMetricMetadata(
  meta: SyntaxNode,
  source: string[],
  slices: string[],
  setGrain: (g: string) => void,
  setFilter: (f: string) => void,
): void {
  for (const ch of meta.namedChildren) {
    if (ch.type === "tag_with_value") {
      const key = ch.namedChildren[0];
      const val = ch.namedChildren[1];
      if (!key || !val) continue;
      switch (key.text) {
        case "source":
          // value_text may contain multiple identifiers for braced source lists
          if (val.type === "value_text") {
            for (const item of val.namedChildren) {
              if (item.type === "identifier" || item.type === "qualified_name") {
                source.push(item.text);
              }
            }
          } else {
            source.push(val.text);
          }
          break;
        case "grain":
          if (val.type === "value_text") {
            const id = val.namedChildren[0];
            if (id) setGrain(id.text);
          } else {
            setGrain(val.text);
          }
          break;
        case "filter":
          setFilter(stripQuotes(val.text));
          break;
      }
    }
    // slice_body is a separate node type for slice { ... }
    if (ch.type === "slice_body") {
      for (const item of ch.namedChildren) {
        if (item.type === "identifier") {
          slices.push(item.text);
        }
      }
    }
  }
}

function extractMetricFields(uri: string, body: SyntaxNode): MetricFieldEntry[] {
  const fields: MetricFieldEntry[] = [];
  for (const fieldNode of children(body, "field_decl")) {
    const nameNode = child(fieldNode, "field_name");
    if (!nameNode) continue;
    const name = fieldNameText(nameNode);
    if (!name) continue;

    const typeExpr = child(fieldNode, "type_expr");
    const meta = child(fieldNode, "metadata_block");

    let measure: MetricFieldEntry["measure"] = null;
    if (meta) {
      measure = extractMeasure(meta);
    }

    fields.push({
      name,
      type: typeExpr?.text ?? "",
      measure,
      notes: extractNotes(uri, fieldNode),
      location: nodeLocation(uri, nameNode),
    });
  }
  return fields;
}

function extractMeasure(
  meta: SyntaxNode,
): MetricFieldEntry["measure"] {
  for (const ch of meta.namedChildren) {
    // Bare "measure" tag appears as tag_token in the CST
    if (ch.type === "tag_token") {
      const text = ch.namedChildren[0]?.text ?? ch.text;
      if (text === "measure") return "additive";
    }
    if (ch.type === "tag_with_value") {
      const key = ch.namedChildren[0];
      if (key?.text === "measure") {
        const val = ch.namedChildren[1];
        if (val) {
          // value_text wraps the actual value identifier
          const valueText = val.type === "value_text"
            ? (val.namedChildren[0]?.text ?? val.text)
            : val.text;
          if (valueText === "additive" || valueText === "non_additive" || valueText === "semi_additive") {
            return valueText;
          }
        }
        return "additive";
      }
    }
  }
  return null;
}

// ---------- Notes & comments extraction ----------

function extractNoteBlock(uri: string, node: SyntaxNode): NoteBlock {
  let text = "";
  let isMultiline = false;
  for (const ch of node.namedChildren) {
    if (ch.type === "multiline_string") {
      text = stringText(ch) ?? "";
      isMultiline = true;
    } else if (ch.type === "nl_string") {
      text = stringText(ch) ?? "";
    }
  }
  return { text, isMultiline, location: nodeLocation(uri, node) };
}

function extractNotes(uri: string, node: SyntaxNode): NoteBlock[] {
  const notes: NoteBlock[] = [];
  for (const ch of node.namedChildren) {
    if (ch.type === "note_block") {
      notes.push(extractNoteBlock(uri, ch));
    }
  }
  // Also check metadata_block for note_tag nodes
  const meta = child(node, "metadata_block");
  if (meta) {
    for (const ch of meta.namedChildren) {
      if (ch.type === "note_tag") {
        const str = child(ch, "nl_string") ?? child(ch, "multiline_string");
        if (str) {
          notes.push({
            text: stringText(str) ?? "",
            isMultiline: str.type === "multiline_string",
            location: nodeLocation(uri, ch),
          });
        }
      }
    }
  }
  return notes;
}

/**
 * Extract //! and //? comments. In the CST these appear as warning_comment
 * and question_comment nodes — either as children or siblings of the node.
 */
function extractComments(uri: string, node: SyntaxNode): CommentEntry[] {
  const comments: CommentEntry[] = [];

  // Check children (all children, not just named) for comment nodes
  for (const ch of node.children) {
    if (ch.type === "warning_comment") {
      comments.push({
        kind: "warning",
        text: extractCommentText(ch),
        location: nodeLocation(uri, ch),
      });
    } else if (ch.type === "question_comment") {
      comments.push({
        kind: "question",
        text: extractCommentText(ch),
        location: nodeLocation(uri, ch),
      });
    }
  }

  // Also check siblings: warning/question comments after this node on the same line
  // or immediately following as separate sibling nodes
  const parent = node.parent;
  if (parent) {
    const siblings = parent.children;
    const nodeIndex = siblings.indexOf(node);
    if (nodeIndex >= 0) {
      for (let i = nodeIndex + 1; i < siblings.length; i++) {
        const sib = siblings[i]!;
        if (sib.type === "warning_comment" && sib.startPosition.row === node.endPosition.row) {
          comments.push({
            kind: "warning",
            text: extractCommentText(sib),
            location: nodeLocation(uri, sib),
          });
        } else if (sib.type === "question_comment" && sib.startPosition.row === node.endPosition.row) {
          comments.push({
            kind: "question",
            text: extractCommentText(sib),
            location: nodeLocation(uri, sib),
          });
        } else {
          break;
        }
      }
    }
  }

  return comments;
}

// ---------- Metadata extraction ----------

function extractMetadataEntries(meta: SyntaxNode): MetadataEntry[] {
  const entries: MetadataEntry[] = [];
  for (const ch of meta.namedChildren) {
    if (ch.type === "tag_token") {
      const text = ch.namedChildren[0]?.text ?? ch.text;
      entries.push({ key: text, value: "" });
    } else if (ch.type === "tag_with_value") {
      const key = ch.namedChildren[0];
      const val = ch.namedChildren[1];
      if (key) {
        entries.push({
          key: key.text,
          value: val ? stripQuotes(val.text) : "",
        });
      }
    } else if (ch.type === "note_tag") {
      const str = child(ch, "nl_string") ?? child(ch, "multiline_string");
      entries.push({
        key: "note",
        value: str ? (stringText(str) ?? "") : "",
      });
    }
  }
  return entries;
}

// ---------- Text helpers ----------

function pathText(node: SyntaxNode): string {
  const text = node.text;
  if (text.startsWith("`") && text.endsWith("`")) {
    return text.slice(1, -1);
  }
  return text;
}

function sourceRefText(ref: SyntaxNode): string | null {
  const qn = child(ref, "qualified_name");
  if (qn) {
    const ids = qn.namedChildren.filter((c) => c.type === "identifier");
    if (ids.length >= 2 && ids[0] && ids[1]) return `${ids[0].text}::${ids[1].text}`;
    return qn.text;
  }
  const bn = child(ref, "backtick_name");
  if (bn) return bn.text.slice(1, -1);
  const id = child(ref, "identifier");
  if (id) return id.text;
  const ns = child(ref, "nl_string");
  if (ns) return ns.text.slice(1, -1);
  return null;
}

function fieldNameText(nameNode: SyntaxNode): string | null {
  const inner = nameNode.namedChildren[0];
  if (!inner) return nameNode.text;
  if (inner.type === "backtick_name") return inner.text.slice(1, -1);
  return inner.text;
}

function stripQuotes(text: string): string {
  if ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function nodeLocation(uri: string, node: SyntaxNode): SourceLocation {
  return {
    uri,
    line: node.startPosition.row,
    character: node.startPosition.column,
  };
}
