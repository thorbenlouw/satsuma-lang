# sfdc-to-snowflake

Maps Salesforce Sales Cloud Opportunity and Account objects into the Snowflake analytics schema with incremental sync and FX rate conversion.

## Key features demonstrated

- Imports from shared library files (`../lib/sfdc_fragments.stm`, `../lookups/finance.stm`)
- SFDC custom field notation (backtick-quoted names)
- Multi-source mapping joining opportunity data with FX rate lookups
- Stage normalization via `map {}` transform
- Incremental sync strategy documented in schema metadata

## Entry point

`pipeline.stm` — single-file scenario
