/**
 * workspace-index.ts — compatibility wrapper around @satsuma/viz-backend.
 *
 * The shared backend now owns workspace indexing so future non-LSP consumers
 * can reuse the same import-scoped definition/reference model. This module
 * remains as a thin re-export layer for existing LSP code and tests.
 */

export * from "@satsuma/viz-backend/workspace-index";
