# namespaces

Three files exercising namespace features across a multi-system retail and data platform architecture.

## Key features demonstrated

- `namespace` blocks with schema, mapping, metric, and fragment definitions
- Cross-namespace references using `ns::schema` qualified names
- Namespace merging (same namespace appearing in multiple blocks in one file)
- Global fragments and transforms shared across all namespaces
- Import of namespace-qualified names from another file

## Entry point

- `namespaces.stm` — multi-system retail platform (POS, e-commerce, warehouse namespaces)
- `ns-platform.stm` — multi-layer data platform that imports from `namespaces.stm`
- `ns-merging.stm` — namespace merging and cross-namespace reference tests
