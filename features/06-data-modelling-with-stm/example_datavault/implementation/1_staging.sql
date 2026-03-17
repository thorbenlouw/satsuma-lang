-- =============================================================================
-- RetailCo Data Vault — Stage 1: Bronze Ingestion
-- Source STM: hub-customer.stm, hub-product.stm, hub-store.stm,
--             link-sale.stm, link-inventory.stm
-- Assumptions: A1 (full snapshots), A2 (sequence col), A3 (parquet),
--              A4 (DQ severity), A5 (catalog/schema), A13 (transforms)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. loyalty_sfdc — Salesforce Service Cloud (Loyalty CRM)
--    STM source: hub-customer.stm → loyalty_sfdc
-- ---------------------------------------------------------------------------

CREATE OR REFRESH STREAMING TABLE retail_dv.staging.stg_loyalty_sfdc (
  CONSTRAINT valid_contact_id   EXPECT (ContactId IS NOT NULL)           ON VIOLATION DROP ROW, -- [pk]
  CONSTRAINT valid_first_name   EXPECT (FirstName IS NOT NULL)           ON VIOLATION DROP ROW, -- [required]
  CONSTRAINT valid_last_name    EXPECT (LastName IS NOT NULL)            ON VIOLATION DROP ROW, -- [required]
  CONSTRAINT valid_acct_created EXPECT (AccountCreatedDate IS NOT NULL)  ON VIOLATION DROP ROW, -- [required]
  CONSTRAINT valid_loyalty_tier EXPECT (LoyaltyTier IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond')
                                        OR LoyaltyTier IS NULL)          ON VIOLATION DROP ROW, -- [enum]
  CONSTRAINT valid_gender       EXPECT (Gender IN ('Male', 'Female', 'Non-binary', 'Undisclosed')
                                        OR Gender IS NULL)               ON VIOLATION DROP ROW  -- [enum]
)
AS SELECT
  *,
  _metadata.file_modification_time AS _load_ts   -- A2: sequence column
FROM cloud_files(
  '/mnt/landing/loyalty_sfdc/',
  'parquet'                                       -- A3: file format
);


-- ---------------------------------------------------------------------------
-- 2. pos_oracle — Oracle Retail POS (transactions + store ref + customer link)
--    STM source: hub-customer.stm → pos_oracle,
--                hub-store.stm   → pos_oracle,
--                link-sale.stm   → pos_oracle
-- ---------------------------------------------------------------------------

CREATE OR REFRESH STREAMING TABLE retail_dv.staging.stg_pos_oracle (
  CONSTRAINT valid_store_id     EXPECT (STORE_ID IS NOT NULL)            ON VIOLATION DROP ROW, -- [pk] / [required]
  CONSTRAINT valid_trans_date   EXPECT (TRANS_DATE IS NOT NULL)          ON VIOLATION DROP ROW, -- [required]
  CONSTRAINT valid_line_nbr     EXPECT (LINE_NBR IS NOT NULL)           ON VIOLATION DROP ROW, -- [required]
  CONSTRAINT valid_sku          EXPECT (SKU IS NOT NULL)                ON VIOLATION DROP ROW, -- [required]
  CONSTRAINT valid_qty          EXPECT (QTY IS NOT NULL)                ON VIOLATION DROP ROW, -- [required]
  CONSTRAINT valid_unit_price   EXPECT (UNIT_PRICE IS NOT NULL)         ON VIOLATION DROP ROW, -- [required]
  CONSTRAINT valid_store_format EXPECT (STORE_FORMAT IN ('FULL', 'OUTLET', 'EXPRESS', 'FLAGSHIP')
                                        OR STORE_FORMAT IS NULL)         ON VIOLATION DROP ROW, -- [enum]
  CONSTRAINT valid_payment_type EXPECT (PAYMENT_TYPE IN ('CA', 'CC', 'DC', 'GC', 'AP', 'GP')
                                        OR PAYMENT_TYPE IS NULL)         ON VIOLATION DROP ROW, -- [enum]
  CONSTRAINT valid_void_flag    EXPECT (VOID_FLAG IN ('Y', 'N')
                                        OR VOID_FLAG IS NULL)            ON VIOLATION DROP ROW, -- [enum]
  CONSTRAINT valid_status       EXPECT (STATUS IN ('A', 'T', 'C')
                                        OR STATUS IS NULL)               ON VIOLATION DROP ROW  -- [enum]
)
AS SELECT
  *,
  _metadata.file_modification_time AS _load_ts
FROM cloud_files(
  '/mnt/landing/pos_oracle/',
  'parquet'
);


-- ---------------------------------------------------------------------------
-- 3. ecom_shopify — Shopify Plus (online customers + orders)
--    STM source: hub-customer.stm → ecom_shopify,
--                link-sale.stm    → ecom_shopify
-- ---------------------------------------------------------------------------

CREATE OR REFRESH STREAMING TABLE retail_dv.staging.stg_ecom_shopify (
  CONSTRAINT valid_order_date   EXPECT (order_date IS NOT NULL)          ON VIOLATION DROP ROW, -- [required]
  CONSTRAINT valid_line_number  EXPECT (line_number IS NOT NULL)        ON VIOLATION DROP ROW, -- [required]
  CONSTRAINT valid_sku          EXPECT (sku IS NOT NULL)                ON VIOLATION DROP ROW, -- [required]
  CONSTRAINT valid_quantity     EXPECT (quantity IS NOT NULL)           ON VIOLATION DROP ROW, -- [required]
  CONSTRAINT valid_unit_price   EXPECT (unit_price IS NOT NULL)        ON VIOLATION DROP ROW  -- [required]
)
AS SELECT
  *,
  COALESCE(discount_amount, 0)     AS discount_amount_clean,            -- [default: 0]
  COALESCE(tax_amount, 0)          AS tax_amount_clean,                 -- [default: 0]
  COALESCE(currency, 'USD')        AS currency_clean,                   -- [default: USD]
  _metadata.file_modification_time AS _load_ts
FROM cloud_files(
  '/mnt/landing/ecom_shopify/',
  'parquet'
);


-- ---------------------------------------------------------------------------
-- 4. merch_sap — SAP MM (product master)
--    STM source: hub-product.stm → merch_sap
-- ---------------------------------------------------------------------------

CREATE OR REFRESH STREAMING TABLE retail_dv.staging.stg_merch_sap (
  CONSTRAINT valid_matnr          EXPECT (MATNR IS NOT NULL)            ON VIOLATION DROP ROW, -- [pk]
  CONSTRAINT valid_maktx          EXPECT (MAKTX IS NOT NULL)            ON VIOLATION DROP ROW, -- [required]
  CONSTRAINT valid_season_code    EXPECT (SEASON_CODE IN ('SP', 'SU', 'FA', 'WI', 'CORE')
                                          OR SEASON_CODE IS NULL)        ON VIOLATION DROP ROW, -- [enum]
  CONSTRAINT valid_lifecycle      EXPECT (LIFECYCLE_STATUS IN ('ACTIVE', 'DISC', 'PEND', 'RECALL')
                                          OR LIFECYCLE_STATUS IS NULL)   ON VIOLATION DROP ROW  -- [enum]
)
AS SELECT
  *,
  _metadata.file_modification_time AS _load_ts
FROM cloud_files(
  '/mnt/landing/merch_sap/',
  'parquet'
);


-- ---------------------------------------------------------------------------
-- 5. wms_manhattan — Manhattan Associates WMS (inventory positions)
--    STM source: link-inventory.stm → wms_manhattan
-- ---------------------------------------------------------------------------

CREATE OR REFRESH STREAMING TABLE retail_dv.staging.stg_wms_manhattan (
  CONSTRAINT valid_sku            EXPECT (SKU IS NOT NULL)              ON VIOLATION DROP ROW, -- [pk]
  CONSTRAINT valid_warehouse_id   EXPECT (WAREHOUSE_ID IS NOT NULL)    ON VIOLATION DROP ROW, -- [pk]
  CONSTRAINT valid_qty_on_hand    EXPECT (QTY_ON_HAND IS NOT NULL)     ON VIOLATION DROP ROW, -- [required]
  CONSTRAINT valid_snapshot_ts    EXPECT (SNAPSHOT_TS IS NOT NULL)     ON VIOLATION DROP ROW  -- [required]
)
AS SELECT
  *,
  COALESCE(QTY_RESERVED, 0)       AS QTY_RESERVED_CLEAN,               -- [default: 0]
  COALESCE(QTY_IN_TRANSIT, 0)     AS QTY_IN_TRANSIT_CLEAN,             -- [default: 0]
  _metadata.file_modification_time AS _load_ts
FROM cloud_files(
  '/mnt/landing/wms_manhattan/',
  'parquet'
);
