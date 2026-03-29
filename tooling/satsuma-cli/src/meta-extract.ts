/**
 * meta-extract.ts — re-export shim
 *
 * Logic now lives in satsuma-core. This file exists for backwards compatibility
 * with internal CLI imports; it will be removed when all callers are updated.
 */
export { extractMetadata } from "@satsuma/core";
export type { MetaEntry, MetaEntryTag, MetaEntryKV, MetaEntryEnum, MetaEntryNote, MetaEntrySlice } from "@satsuma/core";
