---
id: sl-uk9q
status: closed
deps: []
links: []
created: 2026-03-24T08:20:55Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, arrows, nl-refs]
---
# NL-derived arrows attribute wrong source for cross-schema backtick references

When a NL backtick reference points to a field on a schema that is NOT in the mapping's source/target list, the NL-derived arrow is created with an incorrect source attribution.

Example from 'lab results to observations' (source: `lab_results`, target: `clinical_observation`):
NL text: `"Lookup \`fhir_patient.resource_id\` by matching \`PID.MRN\` = \`fhir_patient.mrn\`"`

The NL-derived arrow for \`fhir_patient.mrn\` is:
```json
{
  "source": "lab_results.mrn",    // WRONG: lab_results has no field 'mrn'
  "target": "clinical_observation.patient_ref",
  "classification": "nl-derived"
}
```

The reference is to `fhir_patient.mrn` but the arrow source is attributed to `lab_results.mrn`, which doesn't exist. The NL-derived arrow machinery seems to strip the schema prefix and reattach the mapping's source schema.

## Acceptance Criteria

1. NL-derived arrows for cross-schema references correctly attribute the source to the referenced schema
2. If the referenced schema is not in source/target, the arrow should indicate this (e.g. external_ref flag)
3. The source field should match the actual field that exists on the referenced schema
4. No arrows should be created pointing to non-existent source fields


## Notes

**2026-03-24T09:05:00Z**

Cause: NL-derived arrows used the queried field name as source, and the JSON formatter qualified it with the mapping's first source schema even for cross-schema references.
Fix: NL-derived arrows now use resolvedTo.name as the source path, which includes the actual referenced schema. Also fixed schema extraction from resolved paths in validate.ts to handle nested field paths. (commit pending)
