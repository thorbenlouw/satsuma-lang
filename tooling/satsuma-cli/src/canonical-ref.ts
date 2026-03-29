/**
 * canonical-ref.ts — re-export shim
 *
 * Logic now lives in satsuma-core. This file exists for backwards compatibility
 * with internal CLI imports; it will be removed when all callers are updated.
 */
export { canonicalRef, canonicalEntityName } from "@satsuma/core";
