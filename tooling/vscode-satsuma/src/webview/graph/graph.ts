/**
 * Webview-side graph rendering for Satsuma workspace graph.
 * Uses vanilla SVG — no D3 dependency needed for this DAG layout.
 */

// @ts-nocheck — runs in webview context, no node/vscode types

const vscode = acquireVsCodeApi();

interface GraphNode {
  id: string;
  kind: string;
  namespace: string | null;
  file: string;
  line: number;
  fields?: Array<{ name: string }>;
  sources?: string[];
  targets?: string[];
}

interface SchemaEdge {
  from: string;
  to: string;
  role: string;
}

interface GraphData {
  stats?: Record<string, number>;
  nodes: GraphNode[];
  schema_edges: SchemaEdge[];
}

let currentData: GraphData | null = null;
let currentFilter = "";

// Listen for messages from extension
window.addEventListener("message", (event) => {
  const msg = event.data;
  if (msg.type === "graphData") {
    currentData = msg.payload;
    render(currentData!, currentFilter);
  } else if (msg.type === "error") {
    showError(msg.message);
  }
});

// Namespace filter
document.getElementById("namespace-filter")?.addEventListener("change", (e) => {
  currentFilter = (e.target as HTMLSelectElement).value;
  if (currentData) render(currentData, currentFilter);
});

function render(data: GraphData, nsFilter: string): void {
  updateNamespaceDropdown(data.nodes);
  updateStats(data.stats);

  // Filter nodes by namespace
  let nodes = data.nodes;
  if (nsFilter) {
    nodes = nodes.filter((n) => n.namespace === nsFilter);
  }
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = (data.schema_edges ?? []).filter(
    (e) => nodeIds.has(e.from) && nodeIds.has(e.to),
  );

  // Simple layer-based layout
  const layout = computeLayout(nodes, edges);

  const svg = document.getElementById("graph") as unknown as SVGSVGElement;
  svg.innerHTML = "";

  const width = window.innerWidth;
  const height = window.innerHeight;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  // Draw edges first (behind nodes)
  for (const edge of edges) {
    const from = layout.get(edge.from);
    const to = layout.get(edge.to);
    if (!from || !to) continue;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(from.x));
    line.setAttribute("y1", String(from.y));
    line.setAttribute("x2", String(to.x));
    line.setAttribute("y2", String(to.y));
    line.setAttribute("class", `edge edge-${classForRole(edge.role)}`);
    line.setAttribute("marker-end", "url(#arrowhead)");
    svg.appendChild(line);
  }

  // Arrow marker
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `<marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
    <polygon points="0 0, 8 3, 0 6" fill="#888"/>
  </marker>`;
  svg.prepend(defs);

  // Draw nodes
  for (const node of nodes) {
    const pos = layout.get(node.id);
    if (!pos) continue;
    const g = createNodeElement(node, pos.x, pos.y);
    svg.appendChild(g);
  }
}

function computeLayout(
  nodes: GraphNode[],
  edges: SchemaEdge[],
): Map<string, { x: number; y: number }> {
  // Topological layering: sources on left, targets on right
  const inDegree = new Map<string, number>();
  const outEdges = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    outEdges.set(n.id, []);
  }
  for (const e of edges) {
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    outEdges.get(e.from)?.push(e.to);
  }

  // Assign layers via BFS from roots
  const layers = new Map<string, number>();
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      layers.set(id, 0);
    }
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    const layer = layers.get(id) ?? 0;
    for (const next of outEdges.get(id) ?? []) {
      const nextLayer = Math.max(layers.get(next) ?? 0, layer + 1);
      layers.set(next, nextLayer);
      // Only enqueue if all predecessors assigned
      const allPredAssigned = edges
        .filter((e) => e.to === next)
        .every((e) => layers.has(e.from));
      if (allPredAssigned && !queue.includes(next)) {
        queue.push(next);
      }
    }
  }

  // Assign unplaced nodes to layer 0
  for (const n of nodes) {
    if (!layers.has(n.id)) layers.set(n.id, 0);
  }

  // Group by layer
  const maxLayer = Math.max(0, ...layers.values());
  const layerGroups: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const [id, layer] of layers) {
    layerGroups[layer]?.push(id);
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const layerWidth = width / (maxLayer + 2);
  const positions = new Map<string, { x: number; y: number }>();

  for (let l = 0; l <= maxLayer; l++) {
    const group = layerGroups[l] ?? [];
    const layerHeight = height / (group.length + 1);
    for (let i = 0; i < group.length; i++) {
      positions.set(group[i]!, {
        x: (l + 1) * layerWidth,
        y: (i + 1) * layerHeight,
      });
    }
  }

  return positions;
}

function createNodeElement(node: GraphNode, x: number, y: number): SVGGElement {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("class", `node node-${node.kind}`);
  g.setAttribute("transform", `translate(${x},${y})`);
  g.style.cursor = "pointer";

  const label = node.id.length > 20 ? node.id.slice(0, 18) + "…" : node.id;
  const w = Math.max(80, label.length * 7 + 20);
  const h = 30;

  if (node.kind === "mapping") {
    // Diamond shape
    const points = `0,${-h / 2} ${w / 2},0 0,${h / 2} ${-w / 2},0`;
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", points);
    g.appendChild(poly);
  } else if (node.kind === "metric") {
    // Circle
    const circ = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circ.setAttribute("r", String(Math.max(w, h) / 2));
    g.appendChild(circ);
  } else {
    // Rectangle (schema, fragment, transform)
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(-w / 2));
    rect.setAttribute("y", String(-h / 2));
    rect.setAttribute("width", String(w));
    rect.setAttribute("height", String(h));
    if (node.kind === "fragment") {
      rect.setAttribute("rx", "8");
      rect.setAttribute("ry", "8");
    }
    g.appendChild(rect);
  }

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.textContent = label;
  g.appendChild(text);

  // Click to navigate
  g.addEventListener("click", () => {
    vscode.postMessage({
      type: "navigate",
      uri: node.file,
      line: Math.max(0, (node.line ?? 1) - 1),
    });
  });

  // Hover tooltip
  g.addEventListener("mouseenter", (e: MouseEvent) => {
    showTooltip(e, node);
  });
  g.addEventListener("mouseleave", () => {
    hideTooltip();
  });

  return g;
}

function classForRole(role: string): string {
  if (role === "source" || role === "target") return "structural";
  if (role === "fragment_spread") return "nl";
  return "none";
}

function updateNamespaceDropdown(nodes: GraphNode[]): void {
  const select = document.getElementById("namespace-filter") as HTMLSelectElement;
  const namespaces = [...new Set(nodes.map((n) => n.namespace).filter(Boolean))].sort();
  // Keep existing selection
  const current = select.value;
  select.innerHTML = '<option value="">All namespaces</option>';
  for (const ns of namespaces) {
    const opt = document.createElement("option");
    opt.value = ns!;
    opt.textContent = ns!;
    select.appendChild(opt);
  }
  select.value = current;
}

function updateStats(stats?: Record<string, number>): void {
  const el = document.getElementById("stats");
  if (!el || !stats) return;
  const parts: string[] = [];
  if (stats.schemas) parts.push(`${stats.schemas} schemas`);
  if (stats.mappings) parts.push(`${stats.mappings} mappings`);
  if (stats.metrics) parts.push(`${stats.metrics} metrics`);
  el.textContent = parts.join(" · ");
}

// Tooltip helpers
let tooltipEl: HTMLDivElement | null = null;

function showTooltip(e: MouseEvent, node: GraphNode): void {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "tooltip";
    document.body.appendChild(tooltipEl);
  }
  // Clear previous content safely
  while (tooltipEl.firstChild) {
    tooltipEl.removeChild(tooltipEl.firstChild);
  }

  // First line: bold kind, then id as plain text
  const firstLine = document.createElement("div");
  const kindEl = document.createElement("b");
  kindEl.textContent = node.kind;
  firstLine.appendChild(kindEl);
  firstLine.appendChild(document.createTextNode(" " + node.id));
  tooltipEl.appendChild(firstLine);

  // Additional lines
  if (node.fields) {
    const line = document.createElement("div");
    line.textContent = `${node.fields.length} field(s)`;
    tooltipEl.appendChild(line);
  }
  if (node.sources) {
    const line = document.createElement("div");
    line.textContent = `sources: ${node.sources.join(", ")}`;
    tooltipEl.appendChild(line);
  }
  if (node.targets) {
    const line = document.createElement("div");
    line.textContent = `targets: ${node.targets.join(", ")}`;
    tooltipEl.appendChild(line);
  }

  tooltipEl.style.left = `${e.clientX + 12}px`;
  tooltipEl.style.top = `${e.clientY + 12}px`;
  tooltipEl.style.display = "block";
}

function hideTooltip(): void {
  if (tooltipEl) tooltipEl.style.display = "none";
}
