---
id: sl-x8yp
status: closed
deps: []
links: [sl-armj]
created: 2026-03-21T08:04:35Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, mapping, exploratory-testing]
---
# mapping: JSON name field drops namespace prefix, preventing round-trip lookup

When retrieving a namespace-qualified mapping via `mapping --json`, the `name` field in the JSON output drops the namespace prefix. This means the name returned in JSON cannot be used to look up the mapping again without knowing the namespace.

**What I did:**
```bash
satsuma mapping 'mart::build dim_contact' examples/ --json
```

**Expected:** JSON `name` field should be `"mart::build dim_contact"` to match the lookup key.

**Actual:** JSON `name` field is `"build dim_contact"` (namespace stripped).

Interestingly, the `sources` and `targets` arrays DO include namespace prefixes correctly:
```json
"sources": ["vault::hub_contact", "vault::sat_contact_details"],
"targets": ["mart::dim_contact"]
```

Additionally, there is a text-vs-JSON inconsistency: the text output shows `target { \`dim_contact\` }` (without namespace prefix), while JSON shows `"targets": ["mart::dim_contact"]` (with prefix).

Note: bare name lookup also works (`satsuma mapping 'build dim_contact'` finds it), so there is also potential ambiguity if multiple namespaces have the same mapping name.

**Test:** Run against examples/ns-platform.stm


## Notes

**2026-03-22T02:00:00Z**

Cause: Mapping JSON serialization didn't include namespace.
Fix: Added namespace field to mapping JSON output (commit eb4c842).
