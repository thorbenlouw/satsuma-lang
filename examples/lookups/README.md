# lookups

Reference data lookup schemas used by pipeline scenarios.

## Files

- `finance.stm` — FX spot rate lookup schema (`fx_spot_rates`), sourced from OpenExchangeRates API and used by the `sfdc-to-snowflake` scenario for currency conversion

## Usage

Import specific lookup schemas into your pipeline files:

```satsuma
import { fx_spot_rates } from "../lookups/finance.stm"
```
