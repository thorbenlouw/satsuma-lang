---
id: cbh-sttt
status: closed
deps: []
links: [cbh-h0or]
created: 2026-03-25T11:16:10Z
type: bug
priority: 2
assignee: Thorben Louw
---
# mapping: backtick-quoted source field names lose backticks in output

DETAILED DESCRIPTION:
- Command: satsuma mapping 'customer onboarding' /tmp/satsuma-bug-hunt/
- Also affects: --compact and --json modes
- Expected: Backtick-quoted field names like `Account.Name` should retain backticks in output since the dot is part of the field name, not a path separator
- Actual: Output shows bare names without backticks:
    Account.Name -> last_name { ... }
    Contact.Email -> email { ... }
    Lead_Source_Detail__c -> acquisition_channel { trim }
  In JSON: "src": "Account.Name" (no backticks)
- Impact: Account.Name without backticks is ambiguous — it looks like a dotted path (record 'Account', field 'Name') rather than a single field named 'Account.Name'. This breaks round-trip fidelity and could mislead downstream consumers.
- Source file: /tmp/satsuma-bug-hunt/mappings.stm (customer onboarding mapping, lines 53-59)


## Notes

**2026-03-25T12:15:42Z**

**2026-03-25T12:28:00Z**

Cause: pathText helper in mapping.ts explicitly stripped backticks from backtick_path/backtick_name nodes via slice(1, -1).
Fix: Simplified pathText to return the raw node text, preserving backticks in both text and JSON output.
