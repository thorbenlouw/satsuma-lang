# Lesson 05 — Mapping Blocks: Declaring Flow, Not Writing Code

## The Heart of Satsuma

Mapping blocks are where source meets target. They declare the business relationship between source fields and target fields — not implementation code, but a specification of what should happen.

A mapping is a **specification artifact**. It says "this source field should become that target field, transformed in this way." It does not say how the transformation is implemented at runtime.

---

## Mapping Block Structure

Every mapping block follows this pattern:

```stm
mapping 'customer migration' {
  source { `legacy_sqlserver` }
  target { `postgres_db` }

  // arrows go here
}
```

- **`mapping`** — the keyword, optionally followed by a name.
- **`source { }`** — references one or more source schemas using backtick identifiers.
- **`target { }`** — references the target schema.
- **Arrows** — the field-level mappings that connect source to target.

---

## Arrow Types

Arrows are the core of a mapping. They connect a source field to a target field with an optional transform:

### Direct mapping (no transform)

The simplest case — the value passes through unchanged:

```stm
CUST_ID -> legacy_customer_id
```

### With a transform pipeline

Structural operations chained with `|`:

```stm
EMAIL_ADDR -> email { trim | lowercase | validate_email | null_if_invalid }
```

### With natural language

Business rules described in prose:

```stm
-> display_name {
  "If `CUST_TYPE` is null or 'R', trim and concat `FIRST_NM` + ' ' + `LAST_NM`.
   Otherwise, trim `COMPANY_NM`."
}
```

### Mixed (structural + natural language)

Combining pipeline steps with prose:

```stm
PHONE_NBR -> phone {
  "Extract all digits. If 10 digits, assume US country code +1. Format as E.164."
  | warn_if_invalid
}
```

### Computed/derived (no source field)

When the target field is calculated or derived, there is no left-hand side:

```stm
-> migration_timestamp { now_utc() }

-> health_score {
  "Derive from multiple signals: is_active, last_order_date, open_tickets, avg_csat_score."
}
```

---

## Value Maps

For enum-style mappings where source values map to target values, use `map { }`:

```stm
CUST_TYPE -> customer_type {
  map {
    R: "retail"
    B: "business"
    G: "government"
    null: "retail"
  }
}
```

### Conditional maps (range-based)

For numeric ranges:

```stm
LOYALTY_POINTS -> loyalty_tier {
  map {
    < 1000:  "bronze"
    < 5000:  "silver"
    < 10000: "gold"
    default: "platinum"
  }
}
```

Special keys:
- `null` — matches null/missing values.
- `default` or `_` — matches anything not explicitly listed (the fallback).

---

## Arrow Metadata

Arrows can carry metadata in parentheses, just like fields:

```stm
CUST_ID -> customer_id (note "Deterministic UUID from legacy ID") {
  uuid_v5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", CUST_ID)
}
```

This is useful for documenting the rationale behind a transformation without cluttering the transform body itself.

---

## Named vs. Anonymous Mappings

Mappings can be named or anonymous:

```stm
// Named — useful when a file has multiple mappings
mapping 'customer migration' {
  source { `legacy_crm` }
  target { `warehouse_customers` }
  ...
}

mapping 'order migration' {
  source { `legacy_orders` }
  target { `warehouse_orders` }
  ...
}

// Anonymous — fine when there's only one mapping in the file
mapping {
  source { `crm` }
  target { `warehouse` }
  ...
}
```

Name your mappings when there are multiple in a file, or when the name adds clarity for lineage and documentation.

---

## Multi-Source Mappings

When a target draws data from multiple sources, list all sources in the `source` block and describe the join logic:

```stm
mapping 'customer 360' {
  source {
    `crm_customers`       (filter "email NOT LIKE '%@test.internal'")
    `order_transactions`   (filter "status IN ('completed', 'refunded')")
    `support_tickets`      (filter "created_at >= date_sub(now(), interval 12 month)")
    "Join `crm_customers` to `order_transactions` on customer_id (left join).
     Join `crm_customers` to `support_tickets` on customer_id (left join)."
  }
  target { `customer_360` }
  ...
}
```

The `source` block can contain:
- **Schema references** — backtick-quoted schema names.
- **Filters** — `(filter "condition")` metadata on each schema reference.
- **Join logic** — natural-language strings describing how the sources relate.

In the arrows, prefix field names with the schema name to disambiguate:

```stm
crm_customers.email -> email { trim | lowercase }
crm_customers.signup_date -> signup_date
```

---

## Notes Inside Mappings

You can place `note { }` blocks inside a mapping to document assumptions, constraints, or decisions:

```stm
mapping 'customer migration' {
  note {
    "Mapping assumptions:
     - All timestamps assumed US Eastern unless otherwise noted
     - NULL handling: source NULLs preserved unless target has stated default
     - Names are title-cased on migration"
  }

  source { `legacy_sqlserver` }
  target { `postgres_db` }
  ...
}
```

These notes are extracted by the CLI with `satsuma nl` and help the agent understand the mapping's context.

---

## Agent-Assisted Drafting

The agent is most helpful when drafting mappings from source and target schemas. The workflow:

1. **You provide** the source schema, target schema, and business context.
2. **The agent drafts** the mapping block with arrows, transforms, and notes.
3. **You review** for correctness — does each arrow represent the right business relationship?
4. **You iterate** — "The phone formatting logic is wrong, it should also handle extensions." The agent revises.

The agent handles:
- Matching source fields to target fields by name similarity.
- Generating appropriate transform pipelines for type conversions.
- Flagging target fields that have no obvious source (computed fields).
- Detecting unmapped source or target fields.

You handle:
- Confirming that the matches are correct.
- Providing business rules the agent can't infer.
- Deciding how to handle ambiguous cases.

---

## A Complete Mapping Example

Putting it all together, here is a mapping from the Acme Corp scenario:

```stm
mapping 'customer migration' {
  note {
    "Mapping assumptions:
     - All timestamps assumed US Eastern unless otherwise noted
     - NULL handling: source NULLs preserved unless target has stated default"
  }

  source { `legacy_sqlserver` }
  target { `postgres_db` }

  // Identifiers
  CUST_ID -> customer_id { uuid_v5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", CUST_ID) }
  CUST_ID -> legacy_customer_id

  // Customer type
  CUST_TYPE -> customer_type {
    map { R: "retail", B: "business", G: "government", null: "retail" }
  }

  // Name handling
  -> display_name {
    "If `CUST_TYPE` is null or 'R', concat `FIRST_NM` + ' ' + `LAST_NM`.
     Otherwise, use `COMPANY_NM`."
  }
  FIRST_NM   -> first_name    { trim | title_case | null_if_empty }
  LAST_NM    -> last_name     { trim | title_case | null_if_empty }
  COMPANY_NM -> company_name  { trim | null_if_empty }

  // Contact
  EMAIL_ADDR -> email { trim | lowercase | validate_email | null_if_invalid }

  // Financial
  CREDIT_LIMIT -> credit_limit_cents { coalesce(0) | * 100 | round }

  // Status
  ACCOUNT_STATUS -> status {
    map { A: "active", S: "suspended", C: "closed", D: "delinquent" }
  }

  // Dates
  CREATED_DATE -> created_at { parse("MM/DD/YYYY") | drop_if_invalid | assume_utc | to_iso8601 }

  // Audit
  -> migration_timestamp { now_utc() }
}
```

Every arrow tells a story: where the data comes from, where it goes, and what happens along the way.

---

## Key Takeaways

1. A mapping block declares **source**, **target**, and **arrows** — it specifies flow, not implementation.
2. Arrows can be direct, pipelined, natural-language, mixed, or computed (no source).
3. Use `map { }` for enum and range-based value mappings.
4. Multi-source mappings list all sources with optional filters and join logic as natural language.
5. The agent drafts mappings from schemas and business context; you review for meaning and correctness.

---

**Next:** [Lesson 06 — Natural Language Transforms and Agent Reasoning](06-nested-and-array-mappings.md) — why natural-language transforms are a feature, not a limitation.
