# examples

Canonical Satsuma v2 example corpus. Each scenario is a workspace subdirectory with one or more parser-validated `.stm` files.

## Scenarios

| Directory | Description |
|-----------|-------------|
| [`cobol-to-avro/`](cobol-to-avro/) | Mainframe COBOL customer master to Avro Kafka events |
| [`db-to-db/`](db-to-db/) | Legacy SQL Server to PostgreSQL customer migration (Project Phoenix) |
| [`edi-to-json/`](edi-to-json/) | EDI 856 ASN fixed-length messages to MFCS JSON for warehouse ingestion |
| [`filter-flatten-governance/`](filter-flatten-governance/) | Scalar lists, filter/flatten, and governance metadata annotations |
| [`json-api-to-parquet/`](json-api-to-parquet/) | Commerce REST API order responses to Lakehouse Parquet |
| [`merge-strategies/`](merge-strategies/) | All four merge strategies (upsert, append, soft delete, full refresh) |
| [`metrics-platform/`](metrics-platform/) | Business metrics (MRR, CLV, churn, conversion) as terminal lineage nodes |
| [`multi-source/`](multi-source/) | Multi-source arrows, data hub, and three-way join patterns |
| [`namespaces/`](namespaces/) | Namespace blocks, cross-namespace references, and namespace merging |
| [`protobuf-to-parquet/`](protobuf-to-parquet/) | Protobuf Kafka commerce events to session-level Parquet |
| [`reports-and-models/`](reports-and-models/) | Reports, dashboards, and ML models as first-class pipeline consumers |
| [`sap-po-to-mfcs/`](sap-po-to-mfcs/) | SAP ERP purchase order to Oracle MFCS ingestion contract |
| [`sfdc-to-snowflake/`](sfdc-to-snowflake/) | Salesforce Opportunity/Account objects to Snowflake analytics |
| [`xml-to-parquet/`](xml-to-parquet/) | Commerce order XML to Lakehouse Parquet |

## Shared resources

| Directory | Description |
|-----------|-------------|
| [`lib/`](lib/) | Reusable fragments and reference schemas (common, SFDC types) |
| [`lookups/`](lookups/) | Reference data lookup schemas (FX rates) |
