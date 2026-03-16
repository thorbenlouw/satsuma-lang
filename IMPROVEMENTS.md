# STM v1.0 — Gap Analysis & Improvement Roadmap

## Findings from industry survey of source-to-target mapping patterns

*Date: March 2026*

---

## Methodology

This analysis surveyed real-world data mapping patterns across enterprise ETL tools (Azure Data Factory, SSIS, Informatica), healthcare interoperability standards (HL7 v2, FHIR, FHIR Mapping Language), event-driven architectures (Kafka, Avro, Protobuf, Schema Registry), data warehouse patterns (Slowly Changing Dimensions, star schemas), and practitioner resources (mapping document templates, Excel-based workflows, integration guides).

The goal: identify common mapping patterns that STM should express well, track which have been incorporated into v1.0, and prioritize the remaining gaps for future versions.

---

## Current coverage assessment

STM v1.0 now handles the following patterns well (estimated 75-85% of real-world mapping documents):

- Direct field-to-field mapping with type conversion
- Conditional routing / fan-out via `mapping ... [when: ...]` blocks
- Value code mapping (e.g., `R` → `"retail"`)
- Transform pipe chains (trim, lowercase, validate, etc.)
- Lookup enrichment from reference tables
- One-to-many flattening via `flatten:` mapping options
- Many-to-one aggregation via `group_by:` and aggregate transforms
- Nested object hierarchies (JSON, XML)
- Array-to-array iteration with relative paths
- Multi-source / multi-target routing (N:M cardinality)
- Block-level and field-level error handling (`@on_error`, `@reject_target`, `@error_threshold`, `on_fail(...)`)
- Physical format annotations (XPath, byte offsets, CSV headers, EDI filters)
- PII tagging, encryption annotations, data quality notes
- Natural language intent for complex transforms (`nl()`)
- Fragment composition and imports for reuse
- Rich multi-tier documentation (inline comments, notes, field blocks, mapping-entry notes)

---

## Incorporated into v1.0

### GAP-01: Conditional routing / fan-out

**Status: Implemented in v1.0**

**The pattern:** A single source record is routed to *different targets* based on a field value. This is distinct from N:M mapping where all records flow to all targets. Conditional routing means "domestic orders go to warehouse A, international orders go to warehouse B."

**Where it appears:** Azure Data Factory's Conditional Split transformation, SSIS Conditional Split, Apache NiFi routing, SAP CPI Router, virtually every ETL tool supports this as a first-class concept. It is one of the most common patterns in real-world integration.

**STM v1.0 support:** `when:` mapping header options now provide parseable, lintable routing logic without adding a separate top-level construct.

**Implemented syntax:**

```stm
mapping source_orders -> us_warehouse [when: .region == "US"] {
  .order_id -> .order_id
  // ...
}

mapping source_orders -> eu_warehouse [when: .region == "EU"] {
  .order_id -> .order_id
  // ...
}
```

**Rationale:** Guarded mapping blocks were chosen over a dedicated `route` construct because they fit the existing mapping model, keep the grammar smaller, and remain readable for reviewers.

---

### GAP-02: One-to-many record expansion / flattening

**Status: Implemented in v1.0**

**The pattern:** One source record produces *multiple* target records. The most common case is flattening a hierarchical source (JSON with nested arrays) into a flat target (database table with one row per line item, header fields repeated on each row).

**Where it appears:** Azure Data Factory's Flatten transformation, virtually all ETL tools, any JSON-to-relational pipeline. Also common when denormalizing for analytics/reporting.

**STM v1.0 support:** `flatten:` on the mapping header makes the emitted target grain explicit and allows parent fields plus array-element fields to be mapped together.

**Implemented syntax:**

```stm
mapping order_api -> flat_order_lines [flatten: items[]] {
  // These fields repeat on every output row (from the parent)
  orderId -> order_id
  customerName -> customer_name
  orderDate -> order_date

  // These fields come from each array element
  items[].sku -> product_sku
  items[].quantity -> quantity
  items[].unitPrice -> unit_price
}
```

---

### GAP-03: Aggregation / many-to-one record collapse

**Status: Implemented in v1.0**

**The pattern:** Multiple source records collapse into one target record. Common aggregation operations include SUM, COUNT, MAX, MIN, AVG, FIRST, LAST, with GROUP BY semantics.

**Where it appears:** Every data warehouse load, every reporting pipeline, any integration where transaction-level data is summarized. Also appears in event-driven systems where multiple events produce a single state record.

**STM v1.0 support:** `group_by:` on the mapping header plus aggregate transform functions now provide parseable, lintable many-to-one collapse.

**Implemented syntax:**

```stm
mapping transactions -> customer_summary [group_by: customer_id] {
  customer_id -> customer_id

  amount -> total_spent          : sum
  amount -> avg_transaction      : avg
  => transaction_count           : count
  transaction_date -> last_purchase : max
  => first_purchase              : min(transaction_date)
}
```

**Aggregate functions in v1.0:**

| Function | Description |
|---|---|
| `sum` | Sum of values in group |
| `count` | Count of records in group |
| `avg` | Average of values |
| `min` / `max` | Minimum / maximum value |
| `first` / `last` | First / last value (by ordering) |
| `collect` | Collect values into array |
| `distinct` | Unique values only |

---

### GAP-04: Error handling / rejection strategy

**Status: Implemented in v1.0**

**The pattern:** Every mapping line can fail — validation errors, null required fields, type conversion failures, lookup misses. Production mappings need to declare what happens on failure: skip the field? Reject the whole record? Log and continue? Route to an error queue?

**Where it appears:** Every production ETL pipeline. Informatica has row-level error handling. Azure Data Factory has error rows. SSIS has error outputs on every component.

**STM v1.0 support:** Mapping-level annotations and field-level `on_fail(...)` now cover rejection, skipping, logging, thresholds, and dead-letter routing.

**Implemented syntax:**

```stm
mapping {
  // Block-level defaults
  @on_error(reject)             // skip | reject | log | default
  @reject_target(error_queue)   // where rejected records go
  @error_threshold(0.05)        // fail batch if >5% errors

  // Field-level overrides
  EMAIL -> email 
    : validate_email 
    | on_fail(null)             // field-level: set null on failure

  TAX_ID -> tax_id
    : validate("^\\d{9}$") 
    | on_fail(reject)           // field-level: reject entire record

  PHONE -> phone
    : to_e164 
    | on_fail(log, "Unparseable phone: {PHONE}")  // log and set null
}
```

---

## Remaining gaps

---

### GAP-05: Concept map / external terminology translation

**Priority: MEDIUM-HIGH — Add in v1.0**

**The pattern:** Translating between code systems using an external mapping resource. Unlike our inline `map { R: "retail" }` syntax, these code maps may have thousands of entries (ICD-9 to ICD-10, SNOMED CT, LOINC, currency codes, country codes) and are maintained separately.

**Where it appears:** Healthcare (FHIR's ConceptMap and `$translate` operation), financial services (currency/instrument codes), government (classification codes), any domain with standardized terminologies.

**Current STM workaround:** `lookup()` partially covers this, but concept translation is semantically different — it's a code-system-to-code-system mapping, not a key-value enrichment lookup.

**Proposed syntax:**

```stm
// Define as a lookup with a special annotation
lookup icd9_to_icd10 "ICD-9 to ICD-10 code mapping" {
  @type concept_map
  @source_system "ICD-9-CM"
  @target_system "ICD-10-CM"

  source_code    STRING    [pk]
  target_code    STRING
  equivalence    STRING    [enum: {equal, equivalent, wider, narrower}]
}

// Use via a translate() function (distinct from lookup)
mapping {
  diagnosis_code -> icd10_code
    : translate(icd9_to_icd10, on_miss: error)
}
```

**Alternative:** Extend `lookup()` with a `mode: translate` parameter rather than introducing a new function. The advantage of a separate `translate()` is clarity of intent.

---

### GAP-06: Surrogate key generation

**Priority: LOW — Add transform function in v1.0**

**The pattern:** Generating auto-incrementing or sequence-based surrogate keys for target records, especially in data warehouse dimensional models.

**Current STM workaround:** `uuid_v5()` covers deterministic unique IDs. But sequential integer keys (common in data warehouses) aren't covered.

**Proposed addition:** Add standard transform functions:

```stm
=> customer_key   : sequence("dim_customer_seq")    // named sequence
=> line_number    : row_number                       // position in batch
=> hash_key       : hash_composite(CUST_ID, ORDER_ID)  // deterministic composite key
```

---

### GAP-07: Protobuf / Avro field metadata

**Priority: LOW — Add annotation in v1.0**

**The pattern:** Protobuf schemas assign unique numeric tags to fields. Avro schemas have field ordering dependencies. These are critical metadata for binary serialization formats.

**Current STM workaround:** None — but the fix is trivial.

**Proposed addition:**

```stm
event order_event "Order placed event" @format(protobuf) @schema_registry("https://registry.example.com") {

  order_id      STRING     @tag(1)
  customer_id   STRING     @tag(2)
  amount        DOUBLE     @tag(3)
  items[]       @tag(4) {
    sku         STRING     @tag(1)
    quantity    INT32      @tag(2)
  }
}

event customer_event "Customer updated event" @format(avro) @schema_registry("https://registry.example.com") @schema_version("3.2.1") @namespace("com.example.customers") {

  customer_id   STRING
  email         STRING
  updated_at    LONG       // Avro logical type: timestamp-millis
}
```

---

### GAP-08: Slowly Changing Dimensions (SCD)

**Priority: MEDIUM — Add in v1.1**

**The pattern:** Data warehouse dimension tables that track historical changes over time. SCD Type 1 overwrites old values. Type 2 creates new rows with effective date ranges. Type 6 is a hybrid. This is one of the most common ETL patterns in data warehousing.

**Where it appears:** Every data warehouse. Databricks, Snowflake, Azure Data Factory, SSIS, Informatica all have dedicated SCD handling.

**Current STM workaround:** The target schema can declare the SCD columns (start_date, end_date, is_current), and `nl()` can describe the merge logic. But SCD is so common it deserves a structured annotation.

**Proposed syntax:**

```stm
mapping crm_customer -> dim_customer {
  @scd type2
  @business_key customer_id
  @effective_date valid_from
  @expiry_date valid_to
  @current_flag is_current
  @track [name, email, address, phone]     // columns that trigger new version

  customer_id -> customer_id
  name -> customer_name        : trim | title_case
  email -> email_address       : trim | lowercase
  address -> mailing_address
  phone -> phone_number        : to_e164
  => valid_from                : now_utc()
  => valid_to                  : "9999-12-31T23:59:59Z"
  => is_current                : true
}
```

The `@scd` annotation tells code generators and linters: "This mapping is a Type 2 SCD — generate the appropriate merge/upsert logic with row versioning."

---

### GAP-09: Schema versioning / evolution

**Priority: MEDIUM — Add in v1.1**

**The pattern:** Source and target schemas evolve over time. Kafka topics use Schema Registry to manage backward/forward compatibility. APIs version their schemas. A mapping document should be able to declare which schema versions it targets.

**Where it appears:** Kafka + Schema Registry (Avro, Protobuf, JSON Schema), API versioning, any system with evolving contracts.

**Current STM workaround:** Version can be noted in comments or the integration block, but there's no structured way to declare schema versions or compatibility.

**Proposed syntax:**

```stm
event order_placed "Order event" {
  @schema_version "3.2.1"
  @compatible_with "3.0.0"        // backward compatible since this version
  @schema_registry "https://schema-registry.example.com"
  @subject "order-placed-value"   // Kafka Schema Registry subject

  // fields...
}
```

This metadata enables tooling to verify that the mapping is still valid when a schema evolves, and to flag when a breaking change has occurred.

---

### GAP-10: Deduplication / merge strategy

**Priority: MEDIUM — Add in v1.1**

**The pattern:** When integrating data from multiple sources, the same logical entity may appear in multiple sources with conflicting values. The mapping needs to declare a merge strategy: which source wins for each field, how to handle conflicts, and how to detect duplicates.

**Where it appears:** Customer data integration (CRM + billing + support), master data management, any multi-source consolidation.

**Current STM workaround:** Multiple `mapping` blocks with `nl()` explaining precedence. But this is common enough to warrant structured syntax.

**Proposed syntax:**

```stm
mapping [crm_system, billing_system, support_system] -> master_customer {
  @dedup_key email                         // match records across sources by email
  @merge_strategy source_priority          // or: most_recent, most_complete, custom

  // Explicit source priority per field
  crm_system.name -> display_name          [priority: 1]
  billing_system.name -> display_name      [priority: 2]   // fallback if CRM is null
  
  crm_system.email -> email                                 // CRM always wins for email
  billing_system.phone -> phone                             // billing always wins for phone
  
  // Most recent value wins
  => last_interaction
    : most_recent(crm_system.last_contact, billing_system.last_invoice, support_system.last_ticket)
}
```

---

### GAP-11: Multi-record target creation (normalization)

**Priority: LOW-MEDIUM — Add in v1.2**

**The pattern:** One source record creates records in *multiple target tables* as part of normalization. A flat customer record might become a row in `customers`, a row in `addresses`, and a row in `contacts`, with foreign keys linking them.

**Where it appears:** Any migration from a denormalized source to a normalized target. Our database-to-database example hints at this with `nl("Create a record in the addresses table...")`.

**Current STM workaround:** `nl()` and separate mapping blocks. Workable but not elegant.

**Proposed syntax (future):**

```stm
mapping flat_source -> [customers, addresses, contacts] {
  // Customer record
  CUST_ID -> customers.customer_id : uuid_v5(NS, CUST_ID)
  NAME -> customers.display_name

  // Address record (linked)
  => addresses.address_id : uuid_v4()
  STREET -> addresses.line1
  CITY -> addresses.city
  => customers.address_id : addresses.address_id   // FK reference

  // Contact record (linked)
  => contacts.contact_id : uuid_v4()
  EMAIL -> contacts.email
  PHONE -> contacts.phone
  => contacts.customer_id : customers.customer_id   // FK reference
}
```

---

### GAP-12: Pivot / unpivot operations

**Priority: LOW — Add in v1.2**

**The pattern:** Pivoting turns rows into columns (e.g., monthly values become `jan`, `feb`, `mar` columns). Unpivoting does the reverse (columns become rows).

**Where it appears:** Data warehouse transformations, reporting, any columnar-to-row or row-to-columnar conversion.

**Current STM workaround:** `nl()` handles this adequately. Pivot/unpivot is a transform-layer concern more than a mapping-layer concern.

**Recommendation:** Defer to v1.2. Add `pivot()` and `unpivot()` as transform functions if demand warrants it.

---

## Summary

| Gap | ID | Priority | Target version | Complexity |
|---|---|---|---|---|
| Conditional routing / fan-out | GAP-01 | Implemented | v1.0 | Medium |
| Flatten / expand (one-to-many) | GAP-02 | Implemented | v1.0 | Medium |
| Aggregation (many-to-one) | GAP-03 | Implemented | v1.0 | Medium |
| Error handling / rejection | GAP-04 | Implemented | v1.0 | Medium |
| Concept map / translate | GAP-05 | MEDIUM-HIGH | v1.0 | Low |
| Surrogate key generation | GAP-06 | LOW | v1.0 | Low (new functions) |
| Protobuf / Avro metadata | GAP-07 | LOW | v1.0 | Low (new annotations) |
| Slowly Changing Dimensions | GAP-08 | MEDIUM | v1.1 | Low (annotations) |
| Schema versioning / evolution | GAP-09 | MEDIUM | v1.1 | Low (annotations) |
| Deduplication / merge strategy | GAP-10 | MEDIUM | v1.1 | Medium |
| Multi-record normalization | GAP-11 | LOW-MEDIUM | v1.2 | Medium |
| Pivot / unpivot | GAP-12 | LOW | v1.2 | Low (`nl()` covers it) |

---

## Patterns we deliberately exclude

Some patterns surfaced in research that we intentionally do not include in STM:

**Orchestration and scheduling.** When a mapping runs, how often, retry logic, parallelism — these are concerns for orchestration tools (Airflow, ADF pipelines, cron), not for the mapping spec itself. STM describes *what* transforms, not *when* or *how often*.

**Connection strings and credentials.** How to connect to source/target systems is deployment configuration, not mapping logic. STM describes the *logical* structure, not the *physical* connection.

**Data profiling and quality scoring.** While we support quality notes (`//!` warnings, `note` blocks), statistical profiling (null rates, cardinality, distribution) is a separate concern better handled by profiling tools.

**Full expression language / Turing-complete transforms.** STM's transform language is intentionally limited. Complex business logic should use `nl()` to declare intent, with implementation in a real programming language. We are not building another SQL or Python.

---

## Next steps

1. Remove GAP-01 through GAP-04 from future-planning language elsewhere in the repo where they are still described as open.
2. Decide whether GAP-05, GAP-06, and GAP-07 should also be pulled fully into the normative v1.0 spec or explicitly deferred.
3. Tighten the formal grammar and agent reference so every newly added v1.0 feature is defined consistently in one place.
4. Create canonical examples exercising routing, flattening, aggregation, error handling, and mapping-entry notes together.
5. Add linter and parser implementation notes for the new validation rules and mapping header options.
