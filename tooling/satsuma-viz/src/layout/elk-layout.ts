/**
 * ELK.js layout engine for Satsuma mapping visualization.
 *
 * Converts a VizModel into an ELK graph, runs layered layout, and returns
 * positioned nodes (cards) and routed edges (arrows).
 */

import ELK from "elkjs/lib/elk.bundled.js";
import type {
  VizModel,
  NamespaceGroup,
  SchemaCard,
  MetricCard,
  FragmentCard,
  MappingBlock,
  FieldEntry,
  ArrowEntry,
  EachBlock,
  FlattenBlock,
} from "../model.js";

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Port positions keyed by field name */
  ports: Map<string, { x: number; y: number }>;
}

export interface LayoutEdge {
  id: string;
  sourceNode: string;
  targetNode: string;
  sourceField: string;
  targetField: string;
  /** Array of {x,y} points forming the routed edge path */
  points: Array<{ x: number; y: number }>;
  /** Arrow metadata for rendering style */
  arrow: ArrowEntry;
  /** Context label for each/flatten/source scope */
  scopeLabel?: string;
}

export interface SourceBlockLayout {
  /** Mapping ID this source block belongs to */
  mappingId: string;
  /** Schemas involved in the source block */
  schemas: string[];
  /** Join description text, if any */
  joinDescription: string | null;
  /** Filter expressions */
  filters: string[];
}

export interface LayoutResult {
  nodes: Map<string, LayoutNode>;
  edges: LayoutEdge[];
  sourceBlocks: SourceBlockLayout[];
  width: number;
  height: number;
}

// Card dimension constants (px)
const HEADER_HEIGHT = 40;
const LABEL_HEIGHT = 24;
const FIELD_HEIGHT = 28;
const CARD_PADDING_Y = 8; // top + bottom padding in fields area
const CARD_MIN_WIDTH = 240;
const PORT_Y_OFFSET = FIELD_HEIGHT / 2; // center of field row

const elk = new ELK();

/**
 * Compute layout for a VizModel. Returns positioned nodes and routed edges.
 */
export async function computeLayout(model: VizModel): Promise<LayoutResult> {
  // Build sets of mapped fields per schema (from arrows)
  const mappedFieldsBySchema = buildMappedFieldsIndex(model);

  const elkGraph = buildElkGraph(model, mappedFieldsBySchema);
  const result = await elk.layout(elkGraph);

  return extractLayout(result, model);
}

/** Build an index: schemaId → Set<fieldName> that are source or target of arrows */
function buildMappedFieldsIndex(model: VizModel): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();

  const ensureSet = (id: string) => {
    if (!index.has(id)) index.set(id, new Set());
    return index.get(id)!;
  };

  for (const ns of model.namespaces) {
    for (const m of ns.mappings) {
      const collectArrows = (arrows: ArrowEntry[]) => {
        for (const a of arrows) {
          // Target field belongs to target schema
          ensureSet(m.targetRef).add(a.targetField);
          // Source fields belong to source schemas
          for (const sf of a.sourceFields) {
            for (const sr of m.sourceRefs) {
              ensureSet(sr).add(sf);
            }
          }
        }
      };

      collectArrows(m.arrows);

      const collectEach = (blocks: EachBlock[]) => {
        for (const eb of blocks) {
          collectArrows(eb.arrows);
          collectEach(eb.nestedEach);
        }
      };
      collectEach(m.eachBlocks);

      for (const fb of m.flattenBlocks) {
        collectArrows(fb.arrows);
      }
    }
  }

  return index;
}

function buildElkGraph(
  model: VizModel,
  mappedFields: Map<string, Set<string>>,
): ElkGraph {
  const children: ElkNode[] = [];
  const edges: ElkEdge[] = [];

  for (const ns of model.namespaces) {
    if (ns.name) {
      // Namespace → compound node
      const nsChildren: ElkNode[] = [];
      addSchemaNodes(ns.schemas, mappedFields, nsChildren);
      addFragmentNodes(ns.fragments, nsChildren);
      addMetricNodes(ns.metrics, nsChildren);

      children.push({
        id: `ns:${ns.name}`,
        layoutOptions: {
          "elk.padding": "[top=28,left=16,bottom=16,right=16]",
        },
        children: nsChildren,
        ports: [],
        edges: [],
      });
    } else {
      addSchemaNodes(ns.schemas, mappedFields, children);
      addFragmentNodes(ns.fragments, children);
      addMetricNodes(ns.metrics, children);
    }

    // Edges from mappings
    addMappingEdges(ns.mappings, edges);
  }

  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.spacing.edgeEdge": "15",
      "elk.spacing.edgeNode": "20",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.portConstraints": "FIXED_POS",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    },
    children,
    edges,
  };
}

function addSchemaNodes(
  schemas: SchemaCard[],
  mappedFields: Map<string, Set<string>>,
  target: ElkNode[],
) {
  for (const s of schemas) {
    const ports = buildFieldPorts(s.fields, s.qualifiedId, mappedFields);
    const fieldCount = countFields(s.fields);
    const height =
      HEADER_HEIGHT +
      (s.label ? LABEL_HEIGHT : 0) +
      fieldCount * FIELD_HEIGHT +
      CARD_PADDING_Y;

    target.push({
      id: s.qualifiedId,
      width: CARD_MIN_WIDTH,
      height,
      ports,
      children: [],
      edges: [],
    });
  }
}

function addFragmentNodes(fragments: FragmentCard[], target: ElkNode[]) {
  for (const f of fragments) {
    const ports = buildFieldPorts(f.fields, f.id, new Map());
    const height = HEADER_HEIGHT + f.fields.length * FIELD_HEIGHT + CARD_PADDING_Y;

    target.push({
      id: f.id,
      width: CARD_MIN_WIDTH,
      height,
      ports,
      children: [],
      edges: [],
    });
  }
}

function addMetricNodes(metrics: MetricCard[], target: ElkNode[]) {
  for (const m of metrics) {
    const hasMeta = m.label || m.grain || m.slices.length > 0;
    const metaHeight = hasMeta ? LABEL_HEIGHT : 0;
    const height =
      HEADER_HEIGHT + metaHeight + m.fields.length * FIELD_HEIGHT + CARD_PADDING_Y;

    target.push({
      id: m.qualifiedId,
      width: CARD_MIN_WIDTH,
      height,
      // Metrics have no outgoing ports
      ports: [],
      children: [],
      edges: [],
    });
  }
}

function buildFieldPorts(
  fields: FieldEntry[],
  nodeId: string,
  _mappedFields: Map<string, Set<string>>,
): ElkPort[] {
  const ports: ElkPort[] = [];
  let index = 0;

  const walk = (fieldList: FieldEntry[], depth: number) => {
    for (const f of fieldList) {
      const y = HEADER_HEIGHT + index * FIELD_HEIGHT + PORT_Y_OFFSET;
      // Left port (source side)
      ports.push({
        id: `${nodeId}:${f.name}:src`,
        x: 0,
        y,
        width: 1,
        height: 1,
      });
      // Right port (target side)
      ports.push({
        id: `${nodeId}:${f.name}:tgt`,
        x: CARD_MIN_WIDTH,
        y,
        width: 1,
        height: 1,
      });
      index++;
      if (f.children.length > 0) {
        walk(f.children, depth + 1);
      }
    }
  };

  walk(fields, 0);
  return ports;
}

function countFields(fields: FieldEntry[]): number {
  let count = 0;
  for (const f of fields) {
    count++;
    count += countFields(f.children);
  }
  return count;
}

interface EdgeMeta {
  sourceNode: string;
  targetNode: string;
  sourceField: string;
  targetField: string;
  arrow: ArrowEntry;
}

/** Mapping from edge ID to arrow metadata — used by extractLayout to populate LayoutEdge fields. */
const edgeMetaMap = new Map<string, EdgeMeta>();

function addMappingEdges(mappings: MappingBlock[], edges: ElkEdge[]) {
  edgeMetaMap.clear();

  for (const m of mappings) {
    const addArrowEdges = (arrows: ArrowEntry[], prefix: string) => {
      for (let i = 0; i < arrows.length; i++) {
        const a = arrows[i];
        // Use first source ref as source node (multi-source joins render from first)
        const sourceNode = m.sourceRefs[0];
        if (!sourceNode) continue;
        const sourceField = a.sourceFields[0] ?? a.targetField;
        const edgeId = `${prefix}:${i}`;

        edges.push({
          id: edgeId,
          sources: [`${sourceNode}:${sourceField}:src`],
          targets: [`${m.targetRef}:${a.targetField}:tgt`],
        });

        edgeMetaMap.set(edgeId, {
          sourceNode,
          targetNode: m.targetRef,
          sourceField,
          targetField: a.targetField,
          arrow: a,
        });
      }
    };

    addArrowEdges(m.arrows, `${m.id}:arrow`);

    for (let j = 0; j < m.eachBlocks.length; j++) {
      const collectEachEdges = (eb: EachBlock, ePrefix: string) => {
        addArrowEdges(eb.arrows, `${ePrefix}:each`);
        for (let k = 0; k < eb.nestedEach.length; k++) {
          collectEachEdges(eb.nestedEach[k], `${ePrefix}:nested:${k}`);
        }
      };
      collectEachEdges(m.eachBlocks[j], `${m.id}:eb:${j}`);
    }

    for (let j = 0; j < m.flattenBlocks.length; j++) {
      addArrowEdges(m.flattenBlocks[j].arrows, `${m.id}:flat:${j}`);
    }
  }
}

function extractLayout(
  result: ElkLayoutResult,
  _model: VizModel,
): LayoutResult {
  const nodes = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];

  const walkNodes = (elkNodes: ElkLayoutNode[], offsetX = 0, offsetY = 0) => {
    for (const n of elkNodes) {
      const x = (n.x ?? 0) + offsetX;
      const y = (n.y ?? 0) + offsetY;

      const ports = new Map<string, { x: number; y: number }>();
      for (const p of n.ports ?? []) {
        // Port id format: nodeId:fieldName:src|tgt
        const parts = p.id.split(":");
        const fieldName = parts.slice(1, -1).join(":");
        ports.set(`${fieldName}:${parts[parts.length - 1]}`, {
          x: x + (p.x ?? 0),
          y: y + (p.y ?? 0),
        });
      }

      // Only add non-namespace nodes
      if (!n.id.startsWith("ns:")) {
        nodes.set(n.id, {
          id: n.id,
          x,
          y,
          width: n.width ?? CARD_MIN_WIDTH,
          height: n.height ?? 100,
          ports,
        });
      }

      if (n.children && n.children.length > 0) {
        walkNodes(n.children, x, y);
      }
    }
  };

  walkNodes(result.children ?? []);

  // Extract edge routes
  for (const e of result.edges ?? []) {
    const points: Array<{ x: number; y: number }> = [];

    for (const section of e.sections ?? []) {
      if (section.startPoint) points.push(section.startPoint);
      if (section.bendPoints) points.push(...section.bendPoints);
      if (section.endPoint) points.push(section.endPoint);
    }

    const meta = edgeMetaMap.get(e.id);
    edges.push({
      id: e.id,
      sourceNode: meta?.sourceNode ?? "",
      targetNode: meta?.targetNode ?? "",
      sourceField: meta?.sourceField ?? "",
      targetField: meta?.targetField ?? "",
      points,
      arrow: meta?.arrow ?? {
        sourceFields: [],
        targetField: "",
        transform: null,
        metadata: [],
        comments: [],
        location: { uri: "", line: 0, character: 0 },
      },
    });
  }

  // Collect source blocks from the model
  const sourceBlocks: SourceBlockLayout[] = [];
  for (const ns of _model.namespaces) {
    for (const m of ns.mappings) {
      if (m.sourceBlock) {
        sourceBlocks.push({
          mappingId: m.id,
          schemas: m.sourceBlock.schemas,
          joinDescription: m.sourceBlock.joinDescription,
          filters: m.sourceBlock.filters,
        });
      }
    }
  }

  // Tag edges with scope labels from each/flatten context
  for (const e of edges) {
    if (e.id.includes(":each")) {
      e.scopeLabel = "each";
    } else if (e.id.includes(":flat:")) {
      e.scopeLabel = "flatten";
    }
  }

  return {
    nodes,
    edges,
    sourceBlocks,
    width: result.width ?? 800,
    height: result.height ?? 600,
  };
}

// ---- ELK type stubs (minimal) ----

interface ElkGraph {
  id: string;
  layoutOptions: Record<string, string>;
  children: ElkNode[];
  edges: ElkEdge[];
}

interface ElkNode {
  id: string;
  width?: number;
  height?: number;
  layoutOptions?: Record<string, string>;
  ports: ElkPort[];
  children: ElkNode[];
  edges: ElkEdge[];
}

interface ElkPort {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
}

interface ElkLayoutResult {
  width?: number;
  height?: number;
  children?: ElkLayoutNode[];
  edges?: ElkLayoutEdge[];
}

interface ElkLayoutNode {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  ports?: Array<{ id: string; x?: number; y?: number }>;
  children?: ElkLayoutNode[];
}

interface ElkLayoutEdge {
  id: string;
  sections?: Array<{
    startPoint?: { x: number; y: number };
    endPoint?: { x: number; y: number };
    bendPoints?: Array<{ x: number; y: number }>;
  }>;
}
