# db-to-db

Migrates customer records from a legacy SQL Server 2008 database to a normalized PostgreSQL schema with proper typing, encryption, and referential integrity (Project Phoenix).

## Key features demonstrated

- Fragment import from shared library (`../lib/common.stm`)
- Field-level PII, encrypt, and format annotations
- Multi-step NL transform chains (parse, validate, normalize)
- UUID generation via `uuid_v5` and FK reference to a separate address table
- Map transforms for enum normalization and loyalty tier derivation

## Entry point

`pipeline.stm` — single-file scenario
