---
id: sl-nk6g
status: open
deps: [sl-cxei, sl-uu90, sl-thqe]
links: []
created: 2026-04-02T09:20:46Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-m2s6
---
# spec+docs: reframe pipeline tokens as vocabulary conventions, remove structural/mixed from CLI docs

Update specification and documentation to reflect the simplified language model. Affected files: SATSUMA-V2-SPEC.md (rewrite sections 4.2 arrow declarations, 5.2 named transforms, 7.2 pipeline tokens — reframe as 'vocabulary conventions' that are NL shorthand, not a separate language construct; remove the Pipeline Tokens table or reframe it), SATSUMA-CLI.md (update transform classification table — remove structural and mixed, show only none/nl/nl-derived), AI-AGENT-REFERENCE.md (update accordingly so LLM agents get correct guidance).

## Acceptance Criteria

1. SATSUMA-V2-SPEC.md section 7.2: titled 'Vocabulary Conventions' not 'Pipeline Tokens', explains these are NL shorthand
2. SATSUMA-V2-SPEC.md: no mention of structural or mixed as valid classifications
3. SATSUMA-CLI.md: transform classification table shows only none/nl/nl-derived
4. AI-AGENT-REFERENCE.md: reflects simplified classification model
5. No docs reference structural/mixed as valid outputs or constructs

