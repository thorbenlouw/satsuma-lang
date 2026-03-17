-- =============================================================================
-- RetailCo Data Vault — Stage 2: Hubs
-- Source STM: hub-customer.stm, hub-product.stm, hub-store.stm
-- Assumptions: A6 (hash), A8 (multi-source hub), A9 (zero-key), A15 (record_source)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Hub: Customer  (3 sources — A8: multi-source hub pattern)
-- STM: hub-customer.stm → hub_customer @hub @business_key(customer_id)
-- ---------------------------------------------------------------------------

CREATE OR REFRESH MATERIALIZED VIEW retail_dv.raw_vault.hub_customer
AS
WITH all_sources AS (

  -- Source 1: SFDC (golden source — ContactId is the business key directly)
  SELECT
    CAST(ContactId AS VARCHAR(50))                                AS customer_id,
    'SFDC'                                                        AS record_source,
    _load_ts
  FROM retail_dv.staging.stg_loyalty_sfdc

  UNION ALL

  -- Source 2: POS (loyalty card → SFDC ContactId via lookup — A11, A12)
  SELECT
    -- REVIEW: Loyalty card to SFDC ContactId resolution requires customer_xref table.
    --         nl("Look up SFDC ContactId from loyalty card number. Skip if null or not found.")
    xref.customer_id                                              AS customer_id,
    'POS'                                                         AS record_source,
    pos._load_ts
  FROM retail_dv.staging.stg_pos_oracle pos
  INNER JOIN retail_dv.staging.customer_xref xref                 -- REVIEW: assumed lookup table (A12)
    ON xref.match_key = pos.LOYALTY_CARD_NBR
    AND xref.match_type = 'LOYALTY_CARD'
  WHERE pos.LOYALTY_CARD_NBR IS NOT NULL

  UNION ALL

  -- Source 3: Shopify (email → SFDC ContactId via match — A11, A12)
  SELECT
    -- REVIEW: Email to SFDC ContactId. nl("If no match, create deterministic UUID from email.")
    COALESCE(
      xref.customer_id,
      MD5(LOWER(TRIM(shop.email)))                                -- REVIEW: deterministic UUID fallback
    )                                                             AS customer_id,
    'SHOPIFY'                                                     AS record_source,
    shop._load_ts
  FROM retail_dv.staging.stg_ecom_shopify shop
  LEFT JOIN retail_dv.staging.customer_xref xref
    ON xref.match_key = LOWER(TRIM(shop.email))
    AND xref.match_type = 'EMAIL'

),

-- Deduplicate: keep earliest record per business key (A8)
deduped AS (
  SELECT
    customer_id,
    record_source,
    _load_ts,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id
      ORDER BY _load_ts
    ) AS rn
  FROM all_sources
  WHERE customer_id IS NOT NULL
)

SELECT
  MD5(UPPER(COALESCE(CAST(customer_id AS STRING), 'N/A')))        AS hub_customer_hk,  -- A6: dv_hash
  customer_id,
  _load_ts                                                        AS load_date,
  record_source
FROM deduped
WHERE rn = 1;


-- ---------------------------------------------------------------------------
-- Hub: Product  (single source — SAP MM)
-- STM: hub-product.stm → hub_product @hub @business_key(sku)
-- ---------------------------------------------------------------------------

CREATE OR REFRESH MATERIALIZED VIEW retail_dv.raw_vault.hub_product
AS
WITH deduped AS (
  SELECT
    TRIM(MATNR)                                                   AS sku,              -- trim
    'SAP_MM'                                                      AS record_source,
    _load_ts,
    ROW_NUMBER() OVER (
      PARTITION BY TRIM(MATNR)
      ORDER BY _load_ts
    ) AS rn
  FROM retail_dv.staging.stg_merch_sap
)
SELECT
  MD5(UPPER(COALESCE(CAST(sku AS STRING), 'N/A')))                AS hub_product_hk,
  sku,
  _load_ts                                                        AS load_date,
  record_source
FROM deduped
WHERE rn = 1;


-- ---------------------------------------------------------------------------
-- Hub: Store  (single source — POS Oracle store reference)
-- STM: hub-store.stm → hub_store @hub @business_key(store_id)
-- ---------------------------------------------------------------------------

CREATE OR REFRESH MATERIALIZED VIEW retail_dv.raw_vault.hub_store
AS
WITH deduped AS (
  SELECT
    STORE_ID                                                      AS store_id,
    'POS'                                                         AS record_source,
    _load_ts,
    ROW_NUMBER() OVER (
      PARTITION BY STORE_ID
      ORDER BY _load_ts
    ) AS rn
  FROM retail_dv.staging.stg_pos_oracle
  WHERE STORE_ID IS NOT NULL
)
SELECT
  MD5(UPPER(COALESCE(CAST(store_id AS STRING), 'N/A')))           AS hub_store_hk,
  store_id,
  _load_ts                                                        AS load_date,
  record_source
FROM deduped
WHERE rn = 1;
