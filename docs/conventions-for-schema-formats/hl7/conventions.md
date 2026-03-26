# HL7 v2.x Conventions

## Why This Format is Difficult

HL7 v2.x is the dominant messaging standard in healthcare. It is delimiter-based, like EDIFACT, but adds its own layer of difficulty:

- **Delimiter hierarchy** — segments separated by `\r`, fields by `|`, components by `^`, sub-components by `&`, and repetitions by `~`
- **Positional addressing** — fields are identified by segment and position (e.g., `PID-5` is the fifth field of the PID segment)
- **Component decomposition** — a single field can contain multiple components (e.g., patient name = last^first^middle^suffix^prefix)
- **Inconsistent real-world feeds** — the standard is loosely followed; hospitals, labs, and vendors each produce their own variants
- **Trigger events and message types** — the same segment structures appear across different message types (ADT, ORM, ORU) with different semantics

HL7 v2 is one of the formats where the gap between specification and reality is widest. Natural language is essential for documenting site-specific behaviour.

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `format` | Always `hl7` | `format hl7` |
| `message_type` | HL7 message type | `message_type "ADT^A08"` |
| `version` | HL7 version | `version "2.5.1"` |

### Field-level

| Token | Usage | Example |
|-------|-------|---------|
| `segment` | HL7 segment identifier | `segment PID` |
| `field` | Field position within segment (1-based) | `field 5` |
| `component` | Component position within field | `component 1` |
| `repetition` | Which repetition (if repeating field) | `repetition 1` |

### Guidelines

- Use `segment` on name-first `record` blocks to map each HL7 segment to a structural unit
- Use `field` and `component` together for composite fields like patient name
- Document feed-specific deviations prominently — HL7 feeds are notorious for non-conformance
- Use `list_of record` for repeating segments (e.g., multiple OBX observation segments in an ORU message)

## How Natural Language Helps

- **Component parsing** — "PID-5 contains last^first^middle^suffix^prefix — not all components are always present"
- **Feed-specific quirks** — "Lab system X sends PID-3 as MRN only; Hospital Y includes MRN~encounter number with repetition"
- **Code table interpretation** — "PID-8 administrative sex: M, F, O, U, A, N per HL7 table 0001 — but some feeds send 'MALE'/'FEMALE' as free text"
- **Trigger event context** — "ADT^A08 is an update to patient information; ADT^A01 is an admit — same PID segment, different downstream handling"

## Example

```satsuma
// Satsuma v2 — HL7 ADT Patient Demographics (simplified)

schema hl7_patient (format hl7, message_type "ADT^A08", version "2.5.1",
  note "Patient demographics from ADT update message"
) {
  MSH record (segment MSH, note "Message header — controls routing and versioning") {
    sending_app     STRING  (field 3)
    sending_facility STRING (field 4)
    message_type    STRING  (field 9, note "ADT^A08 for patient update")
    version_id      STRING  (field 12)
  }

  PID record (segment PID, note "Patient identification segment") {
    patient_id      STRING  (field 3, component 1,
      note "CX data type — component 1 is the ID number, component 5 is the ID type"
    )

    last_name       STRING  (field 5, component 1)
    first_name      STRING  (field 5, component 2)
    middle_name     STRING  (field 5, component 3)

    date_of_birth   STRING  (field 7,
      note "Format varies: YYYYMMDD expected, but some feeds send YYYY-MM-DD or MM/DD/YYYY"
    )

    admin_sex       STRING  (field 8, enum {M, F, O, U},
      note "HL7 table 0001 — some feeds send full words instead of codes"
    )

    address_street  STRING  (field 11, component 1)
    address_city    STRING  (field 11, component 3)
    address_state   STRING  (field 11, component 4)
    address_zip     STRING  (field 11, component 5)

    phone_home      STRING  (field 13, pii)
  }

  OBX list_of record (segment OBX, note "Observation segments — repeats per result") {
    value_type      STRING  (field 2, note "NM=numeric, ST=string, CE=coded entry")
    observation_id  STRING  (field 3, component 1)
    observation_text STRING (field 3, component 2)
    value           STRING  (field 5)
    units           STRING  (field 6)
    abnormal_flag   STRING  (field 8, enum {L, H, LL, HH, N})
  }
}
```

### Key patterns

- **Segment-as-record.** Each HL7 segment maps to a `record` block, keeping the familiar structure.
- **Component addressing for composite fields.** PID-5 (patient name) is decomposed into components rather than left as a single string.
- **Repeating segments as lists.** OBX segments repeat per observation result — `list_of record` captures this naturally.
- **Feed variance documented.** Notes flag where real-world feeds deviate from the standard (date formats, sex codes, ID types).
