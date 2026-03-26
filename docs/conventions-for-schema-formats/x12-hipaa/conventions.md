# X12 / HIPAA EDI Conventions

## Why This Format is Difficult

ANSI X12 is the dominant EDI standard in the United States, particularly for healthcare transactions under HIPAA (837 claims, 835 remittance, 270/271 eligibility). It shares EDIFACT's positional, qualifier-driven nature but adds its own complexity:

- **Loop hierarchies** — segments are grouped into loops (e.g., `2000A`, `2010AA`) with hierarchical nesting via HL segments
- **Qualifier-driven semantics** — the same segment type (e.g., `NM1`) means different things depending on an entity identifier qualifier
- **Implementation guide divergence** — the formal X12 standard and payer-specific implementation guides frequently disagree
- **Segment/element/component addressing** — fields are identified by segment ID, element position, and sub-element position (e.g., `NM1-03` is the third element of the NM1 segment)

The repo already has an EDIFACT example (`examples/edi-to-json.stm`). X12 conventions here focus on the differences: loop IDs, HL hierarchies, and qualifier resolution in a US healthcare context.

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `format` | Always `x12` | `format x12` |
| `transaction` | X12 transaction set identifier | `transaction 837` |
| `version` | X12 version | `version "005010X222A1"` |

### Field and record-level

| Token | Usage | Example |
|-------|-------|---------|
| `segment` | X12 segment identifier | `segment NM1` |
| `element` | Element position within segment | `element 3` |
| `component` | Sub-element position | `component 1` |
| `qualifier` | Qualifying value that selects this instance | `qualifier "85"` |
| `loop` | X12 loop identifier | `loop "2010AA"` |

### Guidelines

- Use `loop` on `record` or `list_of record` blocks to make the hierarchical grouping explicit
- Always include `qualifier` when the same segment type appears in multiple roles (e.g., `NM1` for billing provider vs subscriber)
- Reference element positions by number, matching the implementation guide notation (e.g., `NM1-09` → `element 9`)
- Document payer-specific deviations in `note` metadata — these are common and consequential

## How Natural Language Helps

- **Qualifier resolution** — "Qualifier 85 = billing provider, 87 = pay-to provider" — segment meaning depends entirely on these codes
- **Loop grouping** — "Each HL segment with hlevel=20 begins a new subscriber loop" — the nesting logic is implicit in the data stream
- **Implementation guide quirks** — "Payer X requires NM1-09 as NPI even when the guide says it's optional" — the gap between spec and practice
- **Hierarchical parent-child resolution** — "HL-02 references the parent HL-01 to establish claim-to-subscriber relationships"

## Example

```satsuma
// Satsuma v2 — X12 837 Professional Claim (simplified)

schema x12_837_claim (format x12, transaction 837,
  version "005010X222A1",
  note "HIPAA 837P professional claim — simplified for convention reference"
) {
  BILLING_PROVIDER record (loop "2010AA", segment NM1, qualifier "85") {
    entity_type     STRING  (element 1, note "1=person, 2=organisation")
    last_name       STRING  (element 3)
    first_name      STRING  (element 4)
    id_qualifier    STRING  (element 8, note "Expected: XX (NPI)")
    npi             STRING  (element 9)
  }

  SUBSCRIBER record (loop "2010BA", segment NM1, qualifier "IL") {
    last_name       STRING  (element 3)
    first_name      STRING  (element 4)
    member_id       STRING  (element 9)
  }

  SUBSCRIBER_DEMO record (loop "2010BA", segment DMG) {
    date_of_birth   STRING  (element 2, note "Format: CCYYMMDD")
    gender          STRING  (element 3, enum {M, F, U})
  }

  CLAIM_LINES list_of record (loop "2400") {
    SERVICE record (segment SV1) {
      procedure_code  STRING (element 1, component 2,
        note "HCPCS or CPT code from the composite element"
      )
      charge_amount   DECIMAL(10,2) (element 2)
      unit_type       STRING (element 3, enum {UN, MJ})
      units           DECIMAL(6,2) (element 4)
    }

    SERVICE_DATE record (segment DTP, qualifier "472") {
      date_format     STRING (element 2, note "D8=CCYYMMDD, RD8=range")
      service_date    STRING (element 3)
    }
  }
}
```

### Key patterns

- **Qualifier-scoped records.** `NM1` appears multiple times; `qualifier "85"` and `qualifier "IL"` disambiguate without renaming the segment.
- **Loop IDs as structural grouping.** `loop "2010AA"` on a record block maps directly to the implementation guide's hierarchy.
- **Composite elements.** `element 1, component 2` addresses sub-element positions within composite fields like procedure codes.
- **Implementation guide notes.** `note` on fields documents expectations that differ from the base X12 standard.
