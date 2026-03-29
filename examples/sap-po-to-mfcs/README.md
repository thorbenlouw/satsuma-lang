# sap-po-to-mfcs

Maps a logical SAP ERP purchase order into an Oracle MFCS purchase order ingestion contract, modelling the business intent rather than raw IDoc/BAPI transport segments.

## Key features demonstrated

- Business-level schema design (logical contract, not raw ERP payload)
- Header and line-item decomposition
- Lookup-based supplier resolution
- Open-issue documentation for unresolved cross-reference dependencies

## Entry point

`pipeline.stm` — single-file scenario
