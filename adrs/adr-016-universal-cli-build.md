# ADR-016 — Universal CLI Build Replaces Platform Matrix

**Status:** Accepted
**Date:** 2026-03 (retrospective, PR #116)

## Context

The Satsuma CLI was originally released as platform-specific tarballs: `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`, and `win32-x64`. Each artifact contained the Node.js CLI bundle plus a native tree-sitter binary compiled for that platform. The release workflow used a build matrix to produce all 4+ variants.

ADR-002 migrated the parser runtime from native C++ bindings to web-tree-sitter (WASM). After this migration, the CLI no longer contained any platform-specific native code — the WASM binary is portable across all platforms.

The release workflow still produced 4+ platform-specific artifacts, even though they were now identical except for the tarball name. This was confusing for users (which one do I download?) and wasteful in CI time.

## Decision

Replace the platform build matrix with a single universal build producing one `satsuma-cli.tgz` artifact. The release workflow builds once and uploads one artifact to the GitHub release.

Install instructions in the README, site, and CLI reference were updated to reference a single download URL instead of per-platform variants.

## Consequences

**Positive:**
- Users download one artifact regardless of platform — no confusion about which variant to pick
- Release CI time reduced by ~75% (one build instead of four)
- Simpler release workflow with fewer moving parts

**Negative:**
- If a future dependency reintroduces native binaries, the platform matrix must be restored
- Users on exotic platforms cannot verify at download time that the artifact is compatible (though Node.js + WASM should work everywhere Node.js runs)
