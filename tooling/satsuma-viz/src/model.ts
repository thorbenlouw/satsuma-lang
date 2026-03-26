// VizModel — portable document model for Satsuma mapping visualization.
// Produced by the LSP server, consumed by the renderer.
// Keep in sync with tooling/vscode-satsuma/server/src/viz-model.ts.

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
