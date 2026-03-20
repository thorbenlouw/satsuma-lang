# DICOM Conventions

## Why This Format is Difficult

DICOM (Digital Imaging and Communications in Medicine) is the standard for medical imaging data — CT scans, MRIs, X-rays, and associated metadata. It is challenging because:

- **Tag-based binary format** — fields are identified by (group, element) tag pairs like `(0010,0010)` for patient name
- **Value Representations (VR)** — each field has a VR code that determines its encoding and length rules (e.g., `PN` for person name, `DA` for date, `SQ` for sequence)
- **Nested sequences** — `SQ` (Sequence of Items) creates arbitrarily deep nesting
- **Private tags** — vendors define custom tag ranges for proprietary data, with no universal registry
- **Modality variance** — different imaging modalities (CT, MR, US) populate different subsets of tags with different conventions
- **Patient safety stakes** — incorrect interpretation of DICOM metadata can affect clinical decisions

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `format` | Always `dicom` | `format dicom` |
| `modality` | Imaging modality if specific | `modality "CT"` |
| `sop_class` | SOP Class UID if relevant | `sop_class "1.2.840.10008.5.1.4.1.1.2"` |

### Field-level

| Token | Usage | Example |
|-------|-------|---------|
| `dicom_tag` | Tag as (group,element) | `dicom_tag "0010,0010"` |
| `vr` | Value Representation code | `vr PN` |
| `vm` | Value Multiplicity | `vm "1-n"` |
| `private` | Marks a vendor-specific private tag | `private` |
| `private_creator` | Identifies the vendor for a private tag | `private_creator "SIEMENS MR"` |

### Guidelines

- Always include `dicom_tag` and `vr` on every field — these are the canonical identifiers in DICOM
- Use the standard DICOM tag name as the field name (e.g., `PATIENT_NAME`, `STUDY_DATE`)
- Use `list` with `vr SQ` for sequence tags — these are DICOM's nesting mechanism
- Document private tags with `private_creator` so the vendor can be identified
- Mark PII fields (`pii`) — DICOM headers contain extensive patient information

## How Natural Language Helps

- **VR parsing** — "PN (Person Name) uses ^ as component separator: last^first^middle^prefix^suffix"
- **Modality-specific tags** — "Tag (0018,0050) Slice Thickness is populated for CT and MR but absent for CR"
- **Private tag interpretation** — "Siemens private tag (0019,100C) contains b-value for diffusion-weighted MRI sequences"
- **De-identification** — "For research export, tags in groups 0010 (Patient) and 0038 (Visit) must be anonymised per DICOM PS3.15 Annex E"

## Example

```stm
// STM v2 — DICOM CT Study Metadata (simplified)

schema dicom_ct_study (format dicom, modality "CT",
  note "CT study-level metadata — core patient and study tags"
) {
  // --- Patient module ---

  PATIENT_NAME       STRING  (dicom_tag "0010,0010", vr PN, pii,
    note "Person Name: last^first^middle^prefix^suffix"
  )
  PATIENT_ID         STRING  (dicom_tag "0010,0020", vr LO, pii)
  PATIENT_DOB        STRING  (dicom_tag "0010,0030", vr DA, pii,
    note "Format: YYYYMMDD"
  )
  PATIENT_SEX        STRING  (dicom_tag "0010,0040", vr CS, enum {M, F, O})

  // --- Study module ---

  STUDY_DATE         STRING  (dicom_tag "0008,0020", vr DA)
  STUDY_TIME         STRING  (dicom_tag "0008,0030", vr TM,
    note "Format: HHMMSS.FFFFFF — fractional seconds may be truncated"
  )
  STUDY_DESCRIPTION  STRING  (dicom_tag "0008,1030", vr LO)
  STUDY_INSTANCE_UID STRING  (dicom_tag "0020,000D", vr UI, required)
  ACCESSION_NUMBER   STRING  (dicom_tag "0008,0050", vr SH)

  // --- Series-level (nested) ---

  list SERIES (dicom_tag "0020,000E", vr SQ,
    note "One entry per imaging series within the study"
  ) {
    SERIES_INSTANCE_UID STRING (dicom_tag "0020,000E", vr UI, required)
    SERIES_NUMBER       INTEGER (dicom_tag "0020,0011", vr IS)
    SERIES_DESCRIPTION  STRING  (dicom_tag "0008,103E", vr LO)
    SLICE_THICKNESS     DECIMAL (dicom_tag "0018,0050", vr DS,
      note "In millimetres — may be absent for scout/localiser series"
    )
  }

  // --- Vendor private tags ---

  SIEMENS_B_VALUE    INTEGER (
    dicom_tag "0019,100C",
    vr IS,
    private,
    private_creator "SIEMENS MR",
    note "Diffusion b-value — only present in diffusion-weighted sequences"
  )
}
```

### Key patterns

- **Standard tag notation.** `dicom_tag "0010,0010"` matches DICOM documentation and viewer tools exactly.
- **VR as a type system.** `vr PN`, `vr DA`, `vr SQ` encode DICOM's value representation — richer than a simple type annotation.
- **Sequences as lists.** DICOM `SQ` tags map naturally to `list` blocks.
- **Private tags with provenance.** `private` + `private_creator` makes vendor-specific tags traceable rather than opaque.
- **PII marking.** Patient group tags are marked `pii` for de-identification workflows.
