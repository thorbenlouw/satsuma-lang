# cobol-to-avro

Transforms a mainframe COBOL customer master record into an Avro customer-change event for streaming into Kafka, bridging legacy positional packed-decimal records to schema-evolved typed events.

## Key features demonstrated

- `format copybook` with `encoding ebcdic`, `pic`, `offset`, and `length` field annotations
- `REDEFINES`-style conditional interpretation based on a type discriminator field
- `OCCURS` array with filter to exclude trailing blank entries
- COMP-3 packed-decimal decode and rescale in NL transforms
- EBCDIC → UTF-8 string encoding conversion

## Entry point

`pipeline.stm` — single-file scenario
