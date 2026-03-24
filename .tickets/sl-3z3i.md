---
id: sl-3z3i
status: closed
deps: [sl-zf33, sl-j0yf, sl-lu7y, sl-2uzd]
links: []
created: 2026-03-24T18:29:48Z
type: task
priority: 1
assignee: Thorben Louw
tags: [feat-20, phase-1]
---
# Comment and blank line handling

Implement comment preservation (// //! //?) with single space after marker. Inline trailing comments with 2-space gap. Section-header comments preserved as-is. Comment-to-block attachment (pull tight). Blank line normalisation: 2 between top-level blocks, collapse consecutive to 1 within blocks, no trailing blanks, file ends with single newline.

## Acceptance Criteria

- [ ] All three comment types preserved in output
- [ ] Single space after // //! //?
- [ ] Section-header comments (// --- X ---) preserved as-is
- [ ] Inline trailing comments: 2-space minimum gap from code
- [ ] Comments pulled tight to the block they precede (no blank line between)
- [ ] 2 blank lines between top-level blocks
- [ ] Consecutive blank lines within blocks collapse to 1
- [ ] No trailing blank lines, file ends with single newline
- [ ] Tests for all comment and blank line rules


## Notes

**2026-03-24T19:08:41Z**

Cause: New feature. Fix: Implemented comment preservation (all 3 types), single space normalization after markers, section-header preservation, inline trailing comments with 2-space gap, blank line normalization (2 between top-level, 1 within blocks), file header handling, comment-to-block attachment. 55 tests passing.
