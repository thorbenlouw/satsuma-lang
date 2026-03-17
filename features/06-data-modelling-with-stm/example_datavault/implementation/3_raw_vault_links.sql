-- =============================================================================
-- RetailCo Data Vault — Stage 3: Links
-- Source STM: link-sale.stm, link-inventory.stm
-- Assumptions: A6 (hash), A8 (multi-source), A9 (zero-key), A11 (nl), A13 (transforms)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Link: Sale  (Customer + Product + Store — multi-source from POS and Shopify)
-- STM: link-sale.stm → link_sale @link(hub_customer, hub_product, hub_store)
--      Degenerate keys: transaction_id, line_number
-- ---------------------------------------------------------------------------

CREATE OR REFRESH MATERIALIZED VIEW retail_dv.raw_vault.link_sale
AS
WITH all_sources AS (

  -- Source 1: POS in-store transactions
  SELECT
    CONCAT('POS-', CAST(pos.TRANS_ID AS STRING))                  AS transaction_id,   -- prepend("POS-") | to_string
    pos.LINE_NBR                                                  AS line_number,

    -- Hub key resolution
    -- REVIEW: nl("Resolve loyalty card to SFDC ContactId for hub_customer key.
    --            Null if no loyalty card — results in zero-key for customer hub.")
    COALESCE(xref.customer_id, 'N/A')                            AS customer_id,       -- A9: zero-key if null
    TRIM(pos.SKU)                                                 AS sku,               -- trim
    pos.STORE_ID                                                  AS store_id,

    'POS'                                                         AS record_source,
    pos._load_ts
  FROM retail_dv.staging.stg_pos_oracle pos
  LEFT JOIN retail_dv.staging.customer_xref xref                  -- REVIEW: assumed lookup (A12)
    ON xref.match_key = pos.LOYALTY_CARD_NBR
    AND xref.match_type = 'LOYALTY_CARD'

  UNION ALL

  -- Source 2: Shopify online orders
  SELECT
    CONCAT('WEB-', CAST(shop.order_id AS STRING))                 AS transaction_id,   -- prepend("WEB-") | to_string
    shop.line_number                                              AS line_number,

    -- REVIEW: nl("Match email to SFDC ContactId. If no match, generate deterministic UUID from email.")
    COALESCE(
      xref.customer_id,
      MD5(LOWER(TRIM(shop.email)))                                -- REVIEW: deterministic UUID fallback
    )                                                             AS customer_id,
    TRIM(shop.sku)                                                AS sku,               -- trim
    NULL                                                          AS store_id,          -- => store_id : null (online)

    'SHOPIFY'                                                     AS record_source,
    shop._load_ts
  FROM retail_dv.staging.stg_ecom_shopify shop
  LEFT JOIN retail_dv.staging.customer_xref xref
    ON xref.match_key = LOWER(TRIM(shop.email))
    AND xref.match_type = 'EMAIL'

),

deduped AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY transaction_id, line_number
      ORDER BY _load_ts
    ) AS rn
  FROM all_sources
)

SELECT
  -- Link hash key: hash of all hub keys + degenerate keys
  MD5(
    UPPER(COALESCE(CAST(customer_id AS STRING), 'N/A')) || '|' ||
    UPPER(COALESCE(CAST(sku AS STRING), 'N/A')) || '|' ||
    UPPER(COALESCE(CAST(store_id AS STRING), 'N/A')) || '|' ||
    UPPER(COALESCE(CAST(transaction_id AS STRING), 'N/A')) || '|' ||
    UPPER(COALESCE(CAST(line_number AS STRING), 'N/A'))
  )                                                               AS link_sale_hk,

  -- Hub hash keys (A6)
  MD5(UPPER(COALESCE(CAST(customer_id AS STRING), 'N/A')))        AS hub_customer_hk,
  MD5(UPPER(COALESCE(CAST(sku AS STRING), 'N/A')))                AS hub_product_hk,
  MD5(UPPER(COALESCE(CAST(store_id AS STRING), 'N/A')))           AS hub_store_hk,     -- A9: zero-key when NULL

  -- Degenerate keys
  transaction_id,
  line_number,

  _load_ts                                                        AS load_date,
  record_source
FROM deduped
WHERE rn = 1;


-- ---------------------------------------------------------------------------
-- Link: Inventory  (Product + Store/Warehouse)
-- STM: link-inventory.stm → link_inventory @link(hub_product, hub_store)
--      No additional business keys beyond the hub references
-- ---------------------------------------------------------------------------

CREATE OR REFRESH MATERIALIZED VIEW retail_dv.raw_vault.link_inventory
AS
WITH deduped AS (
  SELECT
    TRIM(SKU)                                                     AS sku,               -- trim
    TRIM(WAREHOUSE_ID)                                            AS store_id,          -- trim (warehouse = store)
    'WMS'                                                         AS record_source,
    _load_ts,
    ROW_NUMBER() OVER (
      PARTITION BY TRIM(SKU), TRIM(WAREHOUSE_ID)
      ORDER BY _load_ts
    ) AS rn
  FROM retail_dv.staging.stg_wms_manhattan
)

SELECT
  -- Link hash key: hash of both hub keys
  MD5(
    UPPER(COALESCE(CAST(sku AS STRING), 'N/A')) || '|' ||
    UPPER(COALESCE(CAST(store_id AS STRING), 'N/A'))
  )                                                               AS link_inventory_hk,

  MD5(UPPER(COALESCE(CAST(sku AS STRING), 'N/A')))                AS hub_product_hk,
  MD5(UPPER(COALESCE(CAST(store_id AS STRING), 'N/A')))           AS hub_store_hk,

  _load_ts                                                        AS load_date,
  record_source
FROM deduped
WHERE rn = 1;
