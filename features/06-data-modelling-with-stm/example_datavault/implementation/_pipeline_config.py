# =============================================================================
# RetailCo Data Vault — Shared Pipeline Configuration
# Source: common.stm (dv_hash transform)
# Assumptions: A5 (catalog/schema), A6 (hash algorithm), A12 (lookup tables)
# =============================================================================

CATALOG = "retail_dv"
SCHEMA_STAGING = "staging"
SCHEMA_RAW_VAULT = "raw_vault"
SCHEMA_MARTS = "marts"

LANDING_ROOT = "/mnt/landing"  # A3: Parquet landing zone

# Source-to-path mapping (A1: full daily snapshots)
SOURCE_PATHS = {
    "loyalty_sfdc": f"{LANDING_ROOT}/loyalty_sfdc/",
    "pos_oracle": f"{LANDING_ROOT}/pos_oracle/",
    "ecom_shopify": f"{LANDING_ROOT}/ecom_shopify/",
    "merch_sap": f"{LANDING_ROOT}/merch_sap/",
    "wms_manhattan": f"{LANDING_ROOT}/wms_manhattan/",
}


# ---------------------------------------------------------------------------
# Hash UDF — implements common.stm dv_hash(*fields)
# A6: MD5(UPPER(COALESCE(CAST(col AS STRING), 'N/A')) || '|' || ...)
# ---------------------------------------------------------------------------

import dlt  # noqa: E402
from pyspark.sql import functions as F  # noqa: E402


def dv_hash(*cols):
    """
    Data Vault hash key.  Replicates the dv_hash() transform from common.stm:
      Upper-case all values, replace NULLs with 'N/A',
      concatenate with pipe delimiter, compute MD5 hex digest.
    """
    parts = [F.upper(F.coalesce(F.col(c).cast("string"), F.lit("N/A"))) for c in cols]
    concatenated = parts[0]
    for p in parts[1:]:
        concatenated = F.concat(concatenated, F.lit("|"), p)
    return F.md5(concatenated)


def dv_hash_diff(*cols):
    """Hash diff for satellite change detection (A7)."""
    return dv_hash(*cols)
