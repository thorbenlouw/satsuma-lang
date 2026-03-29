# edi-to-json

Transforms EDI 856 (DESADV) fixed-length ASN messages into MFCS JSON Shipment format for warehouse ingestion, based on mapping specification v1.0.

## Key features demonstrated

- `format edi` with segment qualifiers and `filter` on repeated segments
- Fixed-length field annotations (`offset`, `length`)
- Open-issue documentation via inline `//!` comments
- Required target fields with no source mapping (documented data gap)

## Entry point

`pipeline.stm` — single-file scenario
