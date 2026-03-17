-- =============================================================================
-- RetailCo Data Vault — Stage 6: Sales Fact Mart
-- Source STM: mart-sales.stm
-- Assumptions: A5 (catalog/schema), A16 (join types)
-- =============================================================================

CREATE OR REFRESH MATERIALIZED VIEW retail_dv.marts.mart_fact_sales
AS
SELECT
  -- Transaction identity (from the link)
  l.transaction_id,
  l.line_number,

  -- Business keys resolved from hubs via hash key joins
  hc.customer_id,                                                 -- NULL for anonymous POS purchases
  hp.sku,
  hs.store_id,                                                    -- NULL for online orders

  -- Attributes from the transaction satellite (current version only)
  s.transaction_date,
  s.transaction_time,
  s.channel,
  s.payment_type,

  -- Degenerate dimension
  l.record_source                                                AS source_system,

  -- Measures
  s.quantity,
  s.unit_price,
  s.gross_amount,
  s.discount_amount,
  s.tax_amount,
  s.net_amount,

  -- Vault lineage
  l.link_sale_hk

FROM retail_dv.raw_vault.link_sale l

-- A16: INNER JOIN — every link row has a satellite row
INNER JOIN retail_dv.raw_vault.sat_sale_detail s
  ON s.link_sale_hk = l.link_sale_hk
  AND s.__END_AT IS NULL                                          -- DLT SCD2: current version filter

-- A16: LEFT JOIN — "anonymous POS purchases have no customer"
LEFT JOIN retail_dv.raw_vault.hub_customer hc
  ON hc.hub_customer_hk = l.hub_customer_hk

-- A16: INNER JOIN — every sale has a product
INNER JOIN retail_dv.raw_vault.hub_product hp
  ON hp.hub_product_hk = l.hub_product_hk

-- A16: LEFT JOIN — "online orders have no store"
LEFT JOIN retail_dv.raw_vault.hub_store hs
  ON hs.hub_store_hk = l.hub_store_hk;
