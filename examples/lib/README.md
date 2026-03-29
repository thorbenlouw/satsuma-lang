# lib

Shared library files imported by multiple scenario workspaces.

## Files

- `common.stm` — reusable fragments (`address fields`, `audit columns`) and reference schemas (country codes, currency rates, product catalog)
- `sfdc_fragments.stm` — Salesforce-specific type fragments and field patterns used by the `sfdc-to-snowflake` scenario

## Usage

Import specific items into your pipeline files:

```satsuma
import { `address fields`, `audit columns` } from "../lib/common.stm"
import { `sfdc standard types` } from "../lib/sfdc_fragments.stm"
```
