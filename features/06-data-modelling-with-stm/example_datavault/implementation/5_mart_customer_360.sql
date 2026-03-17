-- =============================================================================
-- RetailCo Data Vault — Stage 5: Customer 360 Mart
-- Source STM: mart-customer-360.stm
-- Assumptions: A5 (catalog/schema), A11 (nl transforms), A16 (join types)
-- =============================================================================

CREATE OR REFRESH MATERIALIZED VIEW retail_dv.marts.mart_customer_360
AS
SELECT
  -- Identity (from hub + demographics satellite)
  h.customer_id,
  d.first_name,
  d.last_name,
  TRIM(INITCAP(CONCAT(d.first_name, ' ', d.last_name)))          AS full_name,            -- trim(first_name + " " + last_name) | title_case

  d.email,
  d.phone,
  d.date_of_birth,
  d.gender,

  -- Address
  d.city,
  d.state_province,
  d.postal_code,
  d.country_code,

  -- Loyalty programme
  d.loyalty_tier,
  d.loyalty_points,
  d.preferred_store_id,
  CAST(h.load_date AS DATE)                                      AS member_since,         -- hub_customer.load_date : truncate_to_date
  d.opt_in_email,
  d.opt_in_sms,

  -- Online behaviour (from Shopify satellite — LEFT JOIN, A16)
  CASE
    WHEN o.hub_customer_hk IS NOT NULL THEN TRUE
    ELSE FALSE
  END                                                             AS has_online_account,   -- when sat_customer_online.hub_customer_hk is not null => true

  COALESCE(o.lifetime_order_count, 0)                             AS online_order_count,   -- coalesce(0)
  COALESCE(o.lifetime_spend, 0)                                   AS online_lifetime_spend, -- coalesce(0)
  o.last_order_at                                                 AS last_online_order_at,

  -- nl("DATEDIFF(days, account_created_at, CURRENT_DATE). Null if no online account.")
  CASE
    WHEN o.account_created_at IS NULL THEN NULL
    ELSE DATEDIFF(DAY, o.account_created_at, CURRENT_DATE())
  END                                                             AS online_account_age_days,

  -- Derived segments (computed across both satellites)
  CASE
    WHEN d.loyalty_tier = 'diamond' AND o.lifetime_spend > 10000
      THEN 'vip'
    WHEN d.loyalty_tier IN ('gold', 'platinum', 'diamond')
      THEN 'high_value'
    WHEN d.loyalty_tier = 'silver'
      THEN 'growth'
    ELSE 'standard'
  END                                                             AS customer_segment,

  CASE
    WHEN d.preferred_store_id IS NOT NULL
      AND COALESCE(o.lifetime_order_count, 0) > 0
      THEN TRUE
    ELSE FALSE
  END                                                             AS is_omnichannel,

  -- Vault lineage
  h.hub_customer_hk,
  h.load_date                                                    AS vault_loaded_at

FROM retail_dv.raw_vault.hub_customer h

-- A16: INNER JOIN — every customer has demographics (primary mapping)
INNER JOIN retail_dv.raw_vault.sat_customer_demographics d
  ON d.hub_customer_hk = h.hub_customer_hk
  AND d.__END_AT IS NULL                                          -- DLT SCD2: current version filter

-- A16: LEFT JOIN — "not all customers have online accounts"
LEFT JOIN retail_dv.raw_vault.sat_customer_online o
  ON o.hub_customer_hk = h.hub_customer_hk
  AND o.__END_AT IS NULL;                                         -- DLT SCD2: current version filter
