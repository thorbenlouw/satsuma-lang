/**
 * viz-model.ts — compatibility wrapper around @satsuma/viz-backend.
 *
 * The shared viz backend now owns model assembly. This module stays in place so
 * existing LSP imports continue to compile while the server and future
 * consumers depend on the shared package boundary directly.
 */

export * from "@satsuma/viz-backend/viz-model";
