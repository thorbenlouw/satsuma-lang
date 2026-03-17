-- =============================================================================
-- RetailCo Data Vault — Stage 4: Satellites
-- Source STM: hub-customer.stm, hub-product.stm, hub-store.stm,
--             link-sale.stm, link-inventory.stm
-- Assumptions: A2 (sequence col), A6/A7 (hash), A10 (effectivity),
--              A11 (nl transforms), A12 (lookups), A13 (transforms)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Satellite: Customer Demographics (from SFDC)
-- STM: hub-customer.stm → sat_customer_demographics @satellite @parent(hub_customer) @scd(type: 2)
-- ---------------------------------------------------------------------------

CREATE OR REFRESH STREAMING TABLE retail_dv.raw_vault.sat_customer_demographics;

APPLY CHANGES INTO retail_dv.raw_vault.sat_customer_demographics
FROM (
  SELECT
    -- Parent hub hash key
    MD5(UPPER(COALESCE(CAST(ContactId AS STRING), 'N/A')))        AS hub_customer_hk,

    -- Mapped fields (from mapping loyalty_sfdc -> sat_customer_demographics)
    TRIM(INITCAP(FirstName))                                      AS first_name,           -- trim | title_case
    TRIM(INITCAP(LastName))                                       AS last_name,            -- trim | title_case
    CASE
      WHEN TRIM(LOWER(Email)) RLIKE '^[^@]+@[^@]+\\.[^@]+$'
      THEN TRIM(LOWER(Email))
      ELSE NULL
    END                                                           AS email,                -- trim | lowercase | validate_email | null_if_invalid
    TRIM(Phone)                                                   AS phone,                -- trim | to_e164
                                                                                           -- REVIEW: E.164 normalization not implemented (A13)
    DateOfBirth                                                   AS date_of_birth,
    LOWER(Gender)                                                 AS gender,               -- lowercase
    TRIM(MailingStreet)                                           AS address_line_1,       -- trim
    TRIM(INITCAP(MailingCity))                                    AS city,                 -- trim | title_case
    UPPER(TRIM(MailingState))                                     AS state_province,       -- REVIEW: nl("Normalize to ISO 3166-2 subdivision code.") — using UPPER(TRIM()) as placeholder (A11)
    TRIM(MailingPostalCode)                                       AS postal_code,          -- trim
    UPPER(TRIM(MailingCountry))                                   AS country_code,         -- REVIEW: nl("Normalize to ISO 3166 alpha-2 code.") — using UPPER(TRIM()) as placeholder (A11)
    LOWER(LoyaltyTier)                                            AS loyalty_tier,         -- lowercase
    LoyaltyPoints                                                 AS loyalty_points,
    PreferredStoreId                                              AS preferred_store_id,
    COALESCE(OptInEmail, FALSE)                                   AS opt_in_email,         -- coalesce(false)
    COALESCE(OptInSMS, FALSE)                                     AS opt_in_sms,           -- coalesce(false)
    'SFDC'                                                        AS record_source,        -- A15

    -- Hash diff for change detection (A7)
    MD5(CONCAT_WS('|',
      UPPER(COALESCE(TRIM(INITCAP(FirstName)), 'N/A')),
      UPPER(COALESCE(TRIM(INITCAP(LastName)), 'N/A')),
      UPPER(COALESCE(TRIM(LOWER(Email)), 'N/A')),
      UPPER(COALESCE(TRIM(Phone), 'N/A')),
      UPPER(COALESCE(CAST(DateOfBirth AS STRING), 'N/A')),
      UPPER(COALESCE(LOWER(Gender), 'N/A')),
      UPPER(COALESCE(TRIM(MailingStreet), 'N/A')),
      UPPER(COALESCE(TRIM(INITCAP(MailingCity)), 'N/A')),
      UPPER(COALESCE(UPPER(TRIM(MailingState)), 'N/A')),
      UPPER(COALESCE(TRIM(MailingPostalCode), 'N/A')),
      UPPER(COALESCE(UPPER(TRIM(MailingCountry)), 'N/A')),
      UPPER(COALESCE(LOWER(LoyaltyTier), 'N/A')),
      UPPER(COALESCE(CAST(LoyaltyPoints AS STRING), 'N/A')),
      UPPER(COALESCE(PreferredStoreId, 'N/A')),
      UPPER(COALESCE(CAST(COALESCE(OptInEmail, FALSE) AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(COALESCE(OptInSMS, FALSE) AS STRING), 'N/A'))
    ))                                                            AS hash_diff,

    _load_ts
  FROM STREAM(retail_dv.staging.stg_loyalty_sfdc)
)
KEYS (hub_customer_hk)
SEQUENCE BY _load_ts
STORED AS SCD TYPE 2;


-- ---------------------------------------------------------------------------
-- Satellite: Customer Online Behaviour (from Shopify)
-- STM: hub-customer.stm → sat_customer_online @satellite @parent(hub_customer) @scd(type: 2)
-- ---------------------------------------------------------------------------

CREATE OR REFRESH STREAMING TABLE retail_dv.raw_vault.sat_customer_online;

APPLY CHANGES INTO retail_dv.raw_vault.sat_customer_online
FROM (
  SELECT
    -- Parent hub hash key — resolved via email match (same logic as hub loading)
    MD5(UPPER(COALESCE(
      CAST(COALESCE(xref.customer_id, MD5(LOWER(TRIM(shop.email)))) AS STRING),
      'N/A'
    )))                                                           AS hub_customer_hk,

    -- Mapped fields (from mapping ecom_shopify -> sat_customer_online)
    shop.customer_id                                              AS shopify_customer_id,
    TRIM(LOWER(shop.email))                                       AS email,                -- trim | lowercase
    TRIM(INITCAP(shop.first_name))                                AS first_name,           -- trim | title_case
    TRIM(INITCAP(shop.last_name))                                 AS last_name,            -- trim | title_case
    shop.orders_count                                             AS lifetime_order_count,
    shop.total_spent                                              AS lifetime_spend,
    shop.last_order_at                                            AS last_order_at,
    shop.created_at                                               AS account_created_at,
    'SHOPIFY'                                                     AS record_source,

    -- Hash diff (A7)
    MD5(CONCAT_WS('|',
      UPPER(COALESCE(CAST(shop.customer_id AS STRING), 'N/A')),
      UPPER(COALESCE(TRIM(LOWER(shop.email)), 'N/A')),
      UPPER(COALESCE(TRIM(INITCAP(shop.first_name)), 'N/A')),
      UPPER(COALESCE(TRIM(INITCAP(shop.last_name)), 'N/A')),
      UPPER(COALESCE(CAST(shop.orders_count AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(shop.total_spent AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(shop.last_order_at AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(shop.created_at AS STRING), 'N/A'))
    ))                                                            AS hash_diff,

    shop._load_ts
  FROM STREAM(retail_dv.staging.stg_ecom_shopify) shop
  LEFT JOIN retail_dv.staging.customer_xref xref                  -- REVIEW: assumed lookup (A12)
    ON xref.match_key = LOWER(TRIM(shop.email))
    AND xref.match_type = 'EMAIL'
)
KEYS (hub_customer_hk)
SEQUENCE BY _load_ts
STORED AS SCD TYPE 2;


-- ---------------------------------------------------------------------------
-- Satellite: Product Attributes (slow-changing, from SAP)
-- STM: hub-product.stm → sat_product_attributes @satellite @parent(hub_product) @scd(type: 2)
-- ---------------------------------------------------------------------------

CREATE OR REFRESH STREAMING TABLE retail_dv.raw_vault.sat_product_attributes;

APPLY CHANGES INTO retail_dv.raw_vault.sat_product_attributes
FROM (
  SELECT
    MD5(UPPER(COALESCE(CAST(TRIM(MATNR) AS STRING), 'N/A')))     AS hub_product_hk,

    TRIM(INITCAP(MAKTX))                                         AS product_name,         -- trim | title_case

    -- Lookup-based fields: product_hierarchy (A12)
    ph.department                                                 AS department,           -- lookup(product_hierarchy, MATKL => department)
    ph.category                                                   AS category,             -- lookup(product_hierarchy, MATKL => category)
    ph.subcategory                                                AS subcategory,          -- lookup(product_hierarchy, MATKL => subcategory)

    TRIM(INITCAP(BRAND))                                          AS brand,                -- trim | title_case
    SUPPLIER_ID                                                   AS supplier_id,
    TRIM(SUPPLIER_NAME)                                           AS supplier_name,        -- trim
    WEIGHT_KG                                                     AS weight_kg,
    COUNTRY_OF_ORIGIN                                             AS country_of_origin,

    CASE SEASON_CODE                                                                       -- map { SP: "spring", ... }
      WHEN 'SP' THEN 'spring'
      WHEN 'SU' THEN 'summer'
      WHEN 'FA' THEN 'fall'
      WHEN 'WI' THEN 'winter'
      WHEN 'CORE' THEN 'core'
    END                                                           AS season,

    CASE LIFECYCLE_STATUS                                                                  -- map { ACTIVE: "active", ... }
      WHEN 'ACTIVE' THEN 'active'
      WHEN 'DISC' THEN 'discontinued'
      WHEN 'PEND' THEN 'pending'
      WHEN 'RECALL' THEN 'recall'
    END                                                           AS lifecycle_status,

    'SAP_MM'                                                      AS record_source,

    -- Hash diff (A7)
    MD5(CONCAT_WS('|',
      UPPER(COALESCE(TRIM(INITCAP(MAKTX)), 'N/A')),
      UPPER(COALESCE(ph.department, 'N/A')),
      UPPER(COALESCE(ph.category, 'N/A')),
      UPPER(COALESCE(ph.subcategory, 'N/A')),
      UPPER(COALESCE(TRIM(INITCAP(BRAND)), 'N/A')),
      UPPER(COALESCE(SUPPLIER_ID, 'N/A')),
      UPPER(COALESCE(TRIM(SUPPLIER_NAME), 'N/A')),
      UPPER(COALESCE(CAST(WEIGHT_KG AS STRING), 'N/A')),
      UPPER(COALESCE(COUNTRY_OF_ORIGIN, 'N/A')),
      UPPER(COALESCE(SEASON_CODE, 'N/A')),
      UPPER(COALESCE(LIFECYCLE_STATUS, 'N/A'))
    ))                                                            AS hash_diff,

    sap._load_ts
  FROM STREAM(retail_dv.staging.stg_merch_sap) sap
  LEFT JOIN retail_dv.staging.product_hierarchy ph                -- REVIEW: assumed reference table (A12)
    ON ph.category_code = sap.MATKL
)
KEYS (hub_product_hk)
SEQUENCE BY _load_ts
STORED AS SCD TYPE 2;


-- ---------------------------------------------------------------------------
-- Satellite: Product Pricing (fast-changing, from SAP)
-- STM: hub-product.stm → sat_product_pricing @satellite @parent(hub_product) @scd(type: 2)
-- ---------------------------------------------------------------------------

CREATE OR REFRESH STREAMING TABLE retail_dv.raw_vault.sat_product_pricing;

APPLY CHANGES INTO retail_dv.raw_vault.sat_product_pricing
FROM (
  SELECT
    MD5(UPPER(COALESCE(CAST(TRIM(MATNR) AS STRING), 'N/A')))     AS hub_product_hk,

    UNIT_COST                                                     AS unit_cost_local,
    WAERS                                                         AS currency_code,

    -- REVIEW: nl("Convert from source currency (WAERS) to USD using daily spot rate.
    --            If WAERS is null, assume USD.")
    CASE
      WHEN WAERS IS NULL OR WAERS = 'USD' THEN UNIT_COST
      ELSE UNIT_COST * er.exchange_rate                           -- REVIEW: requires dim_exchange_rate table (A11)
    END                                                           AS unit_cost_usd,

    -- REVIEW: nl("Convert from source currency (WAERS) to USD using daily spot rate.")
    CASE
      WHEN WAERS IS NULL OR WAERS = 'USD' THEN MSRP
      ELSE MSRP * er.exchange_rate                                -- REVIEW: requires dim_exchange_rate table
    END                                                           AS retail_price_usd,

    -- nl("Calculate as (retail_price_usd - unit_cost_usd) / retail_price_usd * 100.
    --     Null if either price is null or zero.")
    CASE
      WHEN MSRP IS NULL OR MSRP = 0 OR UNIT_COST IS NULL THEN NULL
      ELSE ROUND(
        (COALESCE(CASE WHEN WAERS IS NULL OR WAERS = 'USD' THEN MSRP ELSE MSRP * er.exchange_rate END, 0)
         - COALESCE(CASE WHEN WAERS IS NULL OR WAERS = 'USD' THEN UNIT_COST ELSE UNIT_COST * er.exchange_rate END, 0))
        / COALESCE(CASE WHEN WAERS IS NULL OR WAERS = 'USD' THEN MSRP ELSE MSRP * er.exchange_rate END, 1)
        * 100, 2)
    END                                                           AS margin_pct,

    'SAP_MM'                                                      AS record_source,

    MD5(CONCAT_WS('|',
      UPPER(COALESCE(CAST(UNIT_COST AS STRING), 'N/A')),
      UPPER(COALESCE(WAERS, 'N/A')),
      UPPER(COALESCE(CAST(MSRP AS STRING), 'N/A'))
    ))                                                            AS hash_diff,

    sap._load_ts
  FROM STREAM(retail_dv.staging.stg_merch_sap) sap
  LEFT JOIN retail_dv.staging.dim_exchange_rate er                -- REVIEW: assumed exchange rate table (A11, A12)
    ON er.currency_code = sap.WAERS
    AND er.rate_date = CURRENT_DATE()
)
KEYS (hub_product_hk)
SEQUENCE BY _load_ts
STORED AS SCD TYPE 2;


-- ---------------------------------------------------------------------------
-- Satellite: Store Details (from POS Oracle)
-- STM: hub-store.stm → sat_store_details @satellite @parent(hub_store) @scd(type: 2)
-- ---------------------------------------------------------------------------

CREATE OR REFRESH STREAMING TABLE retail_dv.raw_vault.sat_store_details;

APPLY CHANGES INTO retail_dv.raw_vault.sat_store_details
FROM (
  SELECT
    MD5(UPPER(COALESCE(CAST(STORE_ID AS STRING), 'N/A')))         AS hub_store_hk,

    TRIM(INITCAP(STORE_NAME))                                     AS store_name,           -- trim | title_case

    CASE STORE_FORMAT                                                                      -- map { FULL: "full_line", ... }
      WHEN 'FULL'     THEN 'full_line'
      WHEN 'OUTLET'   THEN 'outlet'
      WHEN 'EXPRESS'  THEN 'express'
      WHEN 'FLAGSHIP' THEN 'flagship'
    END                                                           AS format,

    TRIM(ADDR_LINE_1)                                             AS address_line_1,       -- trim
    TRIM(ADDR_LINE_2)                                             AS address_line_2,       -- trim
    TRIM(INITCAP(CITY))                                           AS city,                 -- trim | title_case
    TRIM(STATE_PROV)                                              AS state_province,       -- trim
    TRIM(POSTAL_CD)                                               AS postal_code,          -- trim
    COUNTRY_CD                                                    AS country_code,
    TRIM(PHONE_NBR)                                               AS phone,                -- trim
    TRIM(INITCAP(STORE_MGR))                                      AS store_manager,        -- trim | title_case
    SQFT                                                          AS square_footage,
    OPEN_DATE                                                     AS opened_date,

    -- Lookup enrichment: store_region_map (A12)
    srm.region                                                    AS region,               -- lookup(store_region_map, STORE_ID => region)
    srm.timezone                                                  AS timezone,             -- lookup(store_region_map, STORE_ID => timezone)

    CASE STATUS                                                                            -- map { A: "active", ... }
      WHEN 'A' THEN 'active'
      WHEN 'T' THEN 'temporarily_closed'
      WHEN 'C' THEN 'closed'
    END                                                           AS status,

    'POS'                                                         AS record_source,

    MD5(CONCAT_WS('|',
      UPPER(COALESCE(TRIM(INITCAP(STORE_NAME)), 'N/A')),
      UPPER(COALESCE(STORE_FORMAT, 'N/A')),
      UPPER(COALESCE(TRIM(ADDR_LINE_1), 'N/A')),
      UPPER(COALESCE(TRIM(ADDR_LINE_2), 'N/A')),
      UPPER(COALESCE(TRIM(INITCAP(CITY)), 'N/A')),
      UPPER(COALESCE(TRIM(STATE_PROV), 'N/A')),
      UPPER(COALESCE(TRIM(POSTAL_CD), 'N/A')),
      UPPER(COALESCE(COUNTRY_CD, 'N/A')),
      UPPER(COALESCE(TRIM(PHONE_NBR), 'N/A')),
      UPPER(COALESCE(TRIM(INITCAP(STORE_MGR)), 'N/A')),
      UPPER(COALESCE(CAST(SQFT AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(OPEN_DATE AS STRING), 'N/A')),
      UPPER(COALESCE(srm.region, 'N/A')),
      UPPER(COALESCE(srm.timezone, 'N/A')),
      UPPER(COALESCE(STATUS, 'N/A'))
    ))                                                            AS hash_diff,

    pos._load_ts
  FROM STREAM(retail_dv.staging.stg_pos_oracle) pos
  LEFT JOIN retail_dv.staging.store_region_map srm                -- REVIEW: assumed reference table (A12)
    ON srm.store_id = pos.STORE_ID
)
KEYS (hub_store_hk)
SEQUENCE BY _load_ts
STORED AS SCD TYPE 2;


-- ---------------------------------------------------------------------------
-- Satellite: Sale Detail (from POS + Shopify)
-- STM: link-sale.stm → sat_sale_detail @satellite @parent(link_sale) @scd(type: 2)
-- ---------------------------------------------------------------------------

CREATE OR REFRESH STREAMING TABLE retail_dv.raw_vault.sat_sale_detail;

APPLY CHANGES INTO retail_dv.raw_vault.sat_sale_detail
FROM (
  -- POS transactions
  SELECT
    -- Parent link hash key (must match link_sale derivation)
    MD5(
      UPPER(COALESCE(CAST(COALESCE(xref.customer_id, 'N/A') AS STRING), 'N/A')) || '|' ||
      UPPER(COALESCE(CAST(TRIM(pos.SKU) AS STRING), 'N/A')) || '|' ||
      UPPER(COALESCE(CAST(pos.STORE_ID AS STRING), 'N/A')) || '|' ||
      UPPER(COALESCE(CONCAT('POS-', CAST(pos.TRANS_ID AS STRING)), 'N/A')) || '|' ||
      UPPER(COALESCE(CAST(pos.LINE_NBR AS STRING), 'N/A'))
    )                                                             AS link_sale_hk,

    pos.TRANS_DATE                                                AS transaction_date,
    pos.TRANS_TIME                                                AS transaction_time,
    'in_store'                                                    AS channel,              -- => channel : "in_store"

    CASE pos.PAYMENT_TYPE                                                                  -- map { CA: "cash", ... }
      WHEN 'CA' THEN 'cash'
      WHEN 'CC' THEN 'credit_card'
      WHEN 'DC' THEN 'debit_card'
      WHEN 'GC' THEN 'gift_card'
      WHEN 'AP' THEN 'apple_pay'
      WHEN 'GP' THEN 'google_pay'
    END                                                           AS payment_type,

    pos.QTY                                                       AS quantity,
    pos.UNIT_PRICE                                                AS unit_price,
    pos.QTY * pos.UNIT_PRICE                                      AS gross_amount,         -- => gross_amount : QTY * UNIT_PRICE
    COALESCE(pos.DISCOUNT_AMT, 0)                                 AS discount_amount,      -- coalesce(0)
    COALESCE(pos.TAX_AMT, 0)                                      AS tax_amount,           -- coalesce(0)
    (pos.QTY * pos.UNIT_PRICE) - COALESCE(pos.DISCOUNT_AMT, 0)
      + COALESCE(pos.TAX_AMT, 0)                                  AS net_amount,           -- nl("gross_amount - discount_amount + tax_amount")
    'POS'                                                         AS record_source,

    MD5(CONCAT_WS('|',
      UPPER(COALESCE(CAST(pos.TRANS_DATE AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(pos.TRANS_TIME AS STRING), 'N/A')),
      'IN_STORE',
      UPPER(COALESCE(pos.PAYMENT_TYPE, 'N/A')),
      UPPER(COALESCE(CAST(pos.QTY AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(pos.UNIT_PRICE AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(COALESCE(pos.DISCOUNT_AMT, 0) AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(COALESCE(pos.TAX_AMT, 0) AS STRING), 'N/A'))
    ))                                                            AS hash_diff,

    pos._load_ts
  FROM STREAM(retail_dv.staging.stg_pos_oracle) pos
  LEFT JOIN retail_dv.staging.customer_xref xref
    ON xref.match_key = pos.LOYALTY_CARD_NBR
    AND xref.match_type = 'LOYALTY_CARD'

  UNION ALL

  -- Shopify transactions
  SELECT
    MD5(
      UPPER(COALESCE(CAST(COALESCE(xref.customer_id, MD5(LOWER(TRIM(shop.email)))) AS STRING), 'N/A')) || '|' ||
      UPPER(COALESCE(CAST(TRIM(shop.sku) AS STRING), 'N/A')) || '|' ||
      'N/A' || '|' ||                                            -- store_id is NULL for online (A9)
      UPPER(COALESCE(CONCAT('WEB-', CAST(shop.order_id AS STRING)), 'N/A')) || '|' ||
      UPPER(COALESCE(CAST(shop.line_number AS STRING), 'N/A'))
    )                                                             AS link_sale_hk,

    shop.order_date                                               AS transaction_date,
    NULL                                                          AS transaction_time,     -- => transaction_time : null
    'online'                                                      AS channel,              -- => channel : "online"
    NULL                                                          AS payment_type,         -- REVIEW: Shopify payment type not yet mapped

    shop.quantity                                                 AS quantity,

    -- REVIEW: nl("Convert from order currency to USD using daily spot rate")
    CASE
      WHEN shop.currency_clean IS NULL OR shop.currency_clean = 'USD' THEN shop.unit_price
      ELSE shop.unit_price * er.exchange_rate                     -- REVIEW: requires dim_exchange_rate (A11)
    END                                                           AS unit_price,

    -- REVIEW: nl("quantity * unit_price (after currency conversion)")
    shop.quantity * CASE
      WHEN shop.currency_clean IS NULL OR shop.currency_clean = 'USD' THEN shop.unit_price
      ELSE shop.unit_price * er.exchange_rate
    END                                                           AS gross_amount,

    COALESCE(shop.discount_amount_clean, 0)                       AS discount_amount,      -- coalesce(0)
    COALESCE(shop.tax_amount_clean, 0)                            AS tax_amount,           -- coalesce(0)

    -- nl("gross_amount - discount_amount + tax_amount")
    (shop.quantity * CASE
      WHEN shop.currency_clean IS NULL OR shop.currency_clean = 'USD' THEN shop.unit_price
      ELSE shop.unit_price * er.exchange_rate
    END) - COALESCE(shop.discount_amount_clean, 0)
         + COALESCE(shop.tax_amount_clean, 0)                     AS net_amount,

    'SHOPIFY'                                                     AS record_source,

    MD5(CONCAT_WS('|',
      UPPER(COALESCE(CAST(shop.order_date AS STRING), 'N/A')),
      'N/A',
      'ONLINE',
      'N/A',
      UPPER(COALESCE(CAST(shop.quantity AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(shop.unit_price AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(COALESCE(shop.discount_amount_clean, 0) AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(COALESCE(shop.tax_amount_clean, 0) AS STRING), 'N/A'))
    ))                                                            AS hash_diff,

    shop._load_ts
  FROM STREAM(retail_dv.staging.stg_ecom_shopify) shop
  LEFT JOIN retail_dv.staging.customer_xref xref
    ON xref.match_key = LOWER(TRIM(shop.email))
    AND xref.match_type = 'EMAIL'
  LEFT JOIN retail_dv.staging.dim_exchange_rate er                -- REVIEW: assumed exchange rate table (A11)
    ON er.currency_code = shop.currency_clean
    AND er.rate_date = shop.order_date
)
KEYS (link_sale_hk)
SEQUENCE BY _load_ts
STORED AS SCD TYPE 2;


-- ---------------------------------------------------------------------------
-- Satellite: Inventory Effectivity (A10)
-- STM: link-inventory.stm → sat_inventory_effectivity @satellite @effectivity
--      @parent(link_inventory) @driving_key(hub_product)
--
-- NOTE: DLT does not natively support "disappearance detection" for effectivity.
-- This is implemented as a MATERIALIZED VIEW that compares the current snapshot
-- against existing effectivity records. See assumption A10.
-- ---------------------------------------------------------------------------

CREATE OR REFRESH MATERIALIZED VIEW retail_dv.raw_vault.sat_inventory_effectivity
AS
WITH current_snapshot AS (
  -- Today's active SKU+warehouse combos from staging
  SELECT DISTINCT
    MD5(
      UPPER(COALESCE(CAST(TRIM(SKU) AS STRING), 'N/A')) || '|' ||
      UPPER(COALESCE(CAST(TRIM(WAREHOUSE_ID) AS STRING), 'N/A'))
    )                                                             AS link_inventory_hk,
    MD5(UPPER(COALESCE(CAST(TRIM(SKU) AS STRING), 'N/A')))       AS hub_product_hk,
    MD5(UPPER(COALESCE(CAST(TRIM(WAREHOUSE_ID) AS STRING), 'N/A'))) AS hub_store_hk,
    _load_ts,
    'WMS'                                                         AS record_source
  FROM retail_dv.staging.stg_wms_manhattan
),

-- Previous effectivity state
prev AS (
  SELECT *
  FROM retail_dv.raw_vault.sat_inventory_effectivity
  WHERE is_current = TRUE
)

-- New relationships: in snapshot but not yet in effectivity
SELECT
  cs.link_inventory_hk,
  cs.hub_product_hk,
  cs.hub_store_hk,
  cs._load_ts                                                    AS start_date,
  CAST(NULL AS TIMESTAMP)                                        AS end_date,
  TRUE                                                           AS is_current,
  cs.record_source,
  cs._load_ts                                                    AS load_date
FROM current_snapshot cs
LEFT JOIN prev p ON p.link_inventory_hk = cs.link_inventory_hk
WHERE p.link_inventory_hk IS NULL

UNION ALL

-- Still active relationships
SELECT
  p.link_inventory_hk,
  p.hub_product_hk,
  p.hub_store_hk,
  p.start_date,
  p.end_date,
  TRUE                                                           AS is_current,
  p.record_source,
  p.load_date
FROM prev p
INNER JOIN current_snapshot cs ON cs.link_inventory_hk = p.link_inventory_hk

UNION ALL

-- End-dated relationships: in effectivity but no longer in snapshot
SELECT
  p.link_inventory_hk,
  p.hub_product_hk,
  p.hub_store_hk,
  p.start_date,
  CURRENT_TIMESTAMP()                                            AS end_date,
  FALSE                                                          AS is_current,
  p.record_source,
  p.load_date
FROM prev p
LEFT JOIN current_snapshot cs ON cs.link_inventory_hk = p.link_inventory_hk
WHERE cs.link_inventory_hk IS NULL;


-- ---------------------------------------------------------------------------
-- Satellite: Inventory Levels (from WMS)
-- STM: link-inventory.stm → sat_inventory_levels @satellite @parent(link_inventory) @scd(type: 2)
-- ---------------------------------------------------------------------------

CREATE OR REFRESH STREAMING TABLE retail_dv.raw_vault.sat_inventory_levels;

APPLY CHANGES INTO retail_dv.raw_vault.sat_inventory_levels
FROM (
  SELECT
    MD5(
      UPPER(COALESCE(CAST(TRIM(SKU) AS STRING), 'N/A')) || '|' ||
      UPPER(COALESCE(CAST(TRIM(WAREHOUSE_ID) AS STRING), 'N/A'))
    )                                                             AS link_inventory_hk,

    TRIM(LOCATION_CODE)                                           AS warehouse_location,   -- trim
    QTY_ON_HAND                                                   AS quantity_on_hand,
    COALESCE(QTY_RESERVED, 0)                                     AS quantity_reserved,     -- coalesce(0)
    COALESCE(QTY_IN_TRANSIT, 0)                                   AS quantity_in_transit,   -- coalesce(0)

    -- nl("QTY_ON_HAND - QTY_RESERVED. Floor at zero.")
    GREATEST(QTY_ON_HAND - COALESCE(QTY_RESERVED, 0), 0)         AS quantity_available,

    -- nl("QTY_ON_HAND * UNIT_COST. Null if UNIT_COST is null.")
    CASE
      WHEN UNIT_COST IS NULL THEN NULL
      ELSE QTY_ON_HAND * UNIT_COST
    END                                                           AS inventory_value,

    -- nl("DATEDIFF(days, LAST_COUNT_DATE, SNAPSHOT_TS). Null if never counted.")
    CASE
      WHEN LAST_COUNT_DATE IS NULL THEN NULL
      ELSE DATEDIFF(DAY, LAST_COUNT_DATE, SNAPSHOT_TS)
    END                                                           AS days_since_count,

    -- when QTY_ON_HAND < REORDER_POINT => true else => false
    CASE
      WHEN QTY_ON_HAND < REORDER_POINT THEN TRUE
      ELSE FALSE
    END                                                           AS is_below_reorder,

    REORDER_QTY                                                   AS reorder_quantity,
    'WMS'                                                         AS record_source,

    MD5(CONCAT_WS('|',
      UPPER(COALESCE(TRIM(LOCATION_CODE), 'N/A')),
      UPPER(COALESCE(CAST(QTY_ON_HAND AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(COALESCE(QTY_RESERVED, 0) AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(COALESCE(QTY_IN_TRANSIT, 0) AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(UNIT_COST AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(LAST_COUNT_DATE AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(REORDER_POINT AS STRING), 'N/A')),
      UPPER(COALESCE(CAST(REORDER_QTY AS STRING), 'N/A'))
    ))                                                            AS hash_diff,

    _load_ts
  FROM STREAM(retail_dv.staging.stg_wms_manhattan)
)
KEYS (link_inventory_hk)
SEQUENCE BY _load_ts
STORED AS SCD TYPE 2;
