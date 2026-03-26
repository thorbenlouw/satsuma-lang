# JSON / JSON API Conventions

## Why This Format Needs Special Handling

JSON is the dominant wire format for REST APIs, event streams, and document stores. Its schema is implicit — there is no built-in schema language that ships with every JSON payload the way XSD accompanies XML. While JSON's tree structure is simpler than XML's namespace-qualified elements, deeply nested API responses still present challenges:

- **Deep nesting** — production APIs routinely nest objects 4-6 levels deep (`$.order.customer.address.geo.lat`), making extraction paths non-obvious
- **Arrays of objects** — line items, tags, and sub-resources arrive as arrays that must be iterated and flattened into relational rows
- **Optional subtrees** — entire branches may be absent depending on API version, query parameters, or resource state
- **Polymorphic payloads** — a single endpoint may return different shapes depending on a discriminator field (`type`, `status`, `event_type`)
- **Whole-subtree grabs** — some nested objects are best preserved as raw JSON blobs rather than decomposed into individual columns

Satsuma's `jsonpath` metadata token gives each field an explicit extraction address, making the mapping from nested API response to flat target unambiguous.

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `format` | Always `json` | `format json` |
| `note` | Context about the API or payload shape | `note "Order REST API v2 response"` |

### Field-level

| Token | Usage | Example |
|-------|-------|---------|
| `jsonpath` | JSONPath expression to extract the value | `jsonpath "$.order.id"` |

JSONPath expressions follow the bracket or dot notation from the [RFC 9535](https://www.rfc-editor.org/rfc/rfc9535) standard. Common forms:

| Pattern | Meaning | Example |
|---------|---------|---------|
| `$.a.b` | Dot-notation traversal | `jsonpath "$.order.customer_id"` |
| `$.a.b[*]` | Iterate all elements of an array | `jsonpath "$.order.line_items[*]"` |
| `.field` | Relative path (inside iterated record) | `jsonpath ".sku"` |
| `$.a.b` (on a JSON-typed field) | Whole subtree, preserved as JSON blob | `jsonpath "$.order.metadata"` |

### Guidelines

- Always quote the `jsonpath` value — expressions contain `$`, `.`, and `[` characters that would conflict with metadata syntax.
- Use absolute paths (`$.root.path`) on top-level and nested `record` fields. Use relative paths (`.field`) inside `list_of record` blocks that already declare an array iteration path on the parent.
- Put `jsonpath` on every source field, even when the path matches the field name. Explicit paths prevent ambiguity when the API shape changes.
- When a nested object should be stored as a raw JSON column (not decomposed), declare the field as `JSON` type with a `jsonpath` pointing at the subtree root.
- Use `note` on fields where the API documentation describes conditional presence, polymorphism, or deprecation.

## When to Use jsonpath vs Native Record Nesting

Satsuma's `record` and `list_of record` blocks already express hierarchy. You do not always need `jsonpath`:

| Situation | Recommendation |
|-----------|---------------|
| Source JSON is shallow (1-2 levels) and field names match | Native `record` nesting is sufficient; `jsonpath` is optional |
| Source JSON is deeply nested or field names differ from target | Use `jsonpath` on every field to make extraction explicit |
| Array of objects must be flattened | Use `jsonpath "$.path[*]"` on the `list_of record` and relative paths on children |
| A subtree should be preserved as a blob | Declare as `JSON` type with `jsonpath` pointing at the subtree |
| Multiple APIs feed the same target | Use `jsonpath` to document each API's divergent structure |

When in doubt, prefer explicit `jsonpath` — it costs one metadata token per field and eliminates guesswork for downstream consumers.

## How Natural Language Helps

JSON APIs often carry interpretation rules that have no structural representation:

- **Conditional fields** — "The `discount` object is only present when `has_discount` is `true`" — this presence logic belongs in a `" "` description on the mapping arrow
- **Polymorphic payloads** — "If `type` is `refund`, the `amount` field is negative" — runtime semantics that metadata cannot capture
- **Pagination and envelope stripping** — "Unwrap from `data` array; ignore `meta` and `links` keys" — preprocessing context for the mapping consumer
- **Version differences** — "In API v1, `customer_email` was nested under `billing`; in v2 it moved to `customer.email`" — migration notes that prevent silent breakage

These belong in `" "` descriptions within mapping blocks, not forced into metadata.

## Example

See [`examples/json-api-to-parquet.stm`](../../../examples/json-api-to-parquet.stm) for the canonical example covering:

1. Simple field extraction (`$.order.order_id`)
2. Nested object traversal (`$.order.customer.email`)
3. Array iteration on `list_of record` (`$.order.line_items[*]`)
4. Relative paths inside array-iterated records (`.sku`, `.quantity`)
5. Whole subtree grab as JSON blob (`$.order.metadata`)

## Patterns

### 1. Simple Field Extraction

```satsuma
order_id  STRING  (jsonpath "$.order.order_id", required)
channel   STRING  (jsonpath "$.order.channel")
```

Direct dot-notation path from the root to a scalar value.

### 2. Nested Object Traversal

```satsuma
Customer record {
  customer_id  STRING  (jsonpath "$.order.customer.id")
  email        STRING  (jsonpath "$.order.customer.email", pii)
}
```

Each field carries its full absolute path. The `record` groups them logically but the `jsonpath` values are what drive extraction.

### 3. Array Iteration

```satsuma
LineItems list_of record (jsonpath "$.order.line_items[*]") {
  sku       STRING  (jsonpath ".sku")
  quantity  INT32   (jsonpath ".quantity")
}
```

The `[*]` on the parent iterates the array. Child fields use relative paths that apply within each element.

### 4. Relative Paths Inside Iterated Records

Inside a `list_of record` with a `jsonpath` containing `[*]`, child paths are relative to each array element:

```satsuma
LineItems list_of record (jsonpath "$.order.line_items[*]") {
  line_number  INT32          (jsonpath ".line_number")
  unit_price   DECIMAL(12,2)  (jsonpath ".unit_price")
  tax_amount   DECIMAL(12,2)  (jsonpath ".tax.amount")
}
```

The `.tax.amount` path traverses a nested object within each array element.

### 5. Whole Subtree as JSON Blob

```satsuma
order_metadata  JSON  (jsonpath "$.order.metadata",
  note "Preserved as raw JSON — contains variable vendor-specific fields"
)
```

When a subtree has an unpredictable or highly variable shape, store it as a `JSON` column rather than decomposing it.
