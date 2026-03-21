---
id: sl-6ctd
status: open
deps: []
links: [sl-btgr]
created: 2026-03-21T08:02:17Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, meta, arrows, exploratory-testing]
---
# meta: arrow-level metadata not queryable and not exposed by arrows command

Arrow metadata (annotations in parentheses on arrow declarations) is completely invisible to the CLI. Neither `satsuma meta` nor `satsuma arrows --json` expose it.

What I did:
  Created a mapping with arrow metadata:
    name -> name (note "Arrow metadata note") { trim }
    email -> email (pii, note "PII propagation") { lowercase }

  Ran: `satsuma arrows tgt.name /tmp/satsuma-test-meta/arrow-meta.stm --json`

Expected:
  Arrow JSON should include a metadata field with the note and any tags.

Actual output:
  {
    "mapping": "arrow test",
    "source": "tgt.name",
    "target": "tgt.name",
    "classification": "structural",
    "transform_raw": "trim",
    "steps": [{"type": "token_call", "text": "trim"}],
    "derived": false,
    ...
  }
  No metadata field at all.

Also tested: `satsuma meta 'arrow test'` only shows mapping-level metadata, not arrow-level.
Also tested: `satsuma mapping 'arrow test'` text output drops arrow annotations entirely.

The spec (section 4.2) explicitly supports arrow metadata:
  CUST_ID -> customer_id (note "Deterministic UUID from legacy ID") { ... }

Real examples use it (sap-po-to-mfcs.stm line 148, edi-to-json.stm line 139).

Fixture: /tmp/satsuma-test-meta/arrow-meta.stm

