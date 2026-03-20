# MARC21 Conventions

## Why This Format is Difficult

MARC21 (Machine-Readable Cataloguing) is the standard for bibliographic records in libraries worldwide. It has been in continuous use since the 1960s and remains the backbone of library catalogue systems. It is challenging because:

- **Tag/indicator/subfield model** — each field is identified by a 3-digit tag (e.g., `245` for title), has two single-character indicators, and contains subfields marked by delimiter codes (`$a`, `$b`, etc.)
- **Domain-specific semantics** — tag meanings are defined by cataloguing rules (RDA, AACR2) that assume deep domain knowledge
- **Indicator significance** — the two indicator positions modify field behaviour in non-obvious ways (e.g., `245` indicator 2 = number of non-filing characters to skip for sorting)
- **Repeatable vs non-repeatable** — some fields and subfields can repeat, others cannot, and the rules vary by tag
- **Fixed-length control fields** — tags 001-009 have positional data with character-by-character meaning (e.g., tag `008` positions 35-37 = language code)
- **Authority vs bibliographic** — the same tag numbers mean different things in authority records vs bibliographic records

MARC21 is unlike any other format in this collection. It is not a data interchange format in the enterprise sense — it is a cultural knowledge representation that predates modern schema concepts.

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `format` | Always `marc21` | `format marc21` |
| `record_type` | Bibliographic, authority, or holdings | `record_type bibliographic` |

### Field-level

| Token | Usage | Example |
|-------|-------|---------|
| `tag` | 3-digit MARC field tag | `tag "245"` |
| `ind1` | First indicator value or meaning | `ind1 "1"` |
| `ind2` | Second indicator value or meaning | `ind2 "0"` |
| `subfield` | Subfield code | `subfield a` |
| `positions` | Character positions for fixed fields | `positions "35-37"` |
| `repeatable` | Whether the field/subfield can repeat | `repeatable` |

### Guidelines

- Use `tag` on every field — MARC cataloguers think in tag numbers
- Use human-readable names alongside tags (e.g., `TITLE_PROPER` with `tag "245"`)
- Use `record` for variable fields with subfield breakdowns
- Use positional metadata for fixed-length control fields (tags 001-009, especially 008)
- Document indicator meanings in `note` — they are rarely self-explanatory

## How Natural Language Helps

- **Indicator interpretation** — "245 indicator 2 = number of non-filing characters (e.g., 4 for 'The ' including the space)"
- **Cataloguing rule context** — "Under RDA, 264 replaces 260 for publication information; older records use 260"
- **Subfield relationships** — "In 700, subfield $e (relator term) qualifies the person in $a — e.g., 'editor', 'translator'"
- **Fixed-field decoding** — "Tag 008 positions 15-17 = place of publication code from MARC Code List for Countries"

## Example

```stm
// Satsuma v2 — MARC21 Bibliographic Record (simplified)

schema marc21_bibliographic (format marc21, record_type bibliographic,
  note "Core bibliographic fields for a monograph record"
) {
  // --- Control fields (fixed-length, positional) ---

  CONTROL_NUMBER   STRING  (tag "001",
    note "Unique record identifier assigned by the cataloguing agency"
  )

  record FIXED_DATA (tag "008",
    note """
    40-character fixed-length data field. Each character position
    has a defined meaning. Common positions for books:
    - 00-05: date entered on file (YYMMDD)
    - 06: type of date (s=single, m=multiple, etc.)
    - 07-10: date 1
    - 15-17: place of publication (MARC country code)
    - 35-37: language (MARC language code)
    """
  ) {
    date_entered     STRING  (positions "00-05")
    date_type        STRING  (positions "06")
    date_1           STRING  (positions "07-10")
    pub_country      STRING  (positions "15-17",
      note "MARC Code List for Countries — e.g., enk=England, xxu=United States"
    )
    language         STRING  (positions "35-37",
      note "MARC Code List for Languages — e.g., eng=English, fre=French"
    )
  }

  // --- Variable fields ---

  list ISBN (tag "020", repeatable) {
    isbn             STRING  (subfield a)
    qualifying_info  STRING  (subfield q, note "e.g., hardback, paperback")
  }

  record TITLE (tag "245",
    note """
    Title statement. Indicator meanings:
    - ind1: 0=no added entry, 1=added entry
    - ind2: number of non-filing characters (e.g., 4 for 'The ')
    """
  ) {
    title_proper     STRING  (subfield a, required)
    remainder        STRING  (subfield b, note "Subtitle or other title information")
    responsibility   STRING  (subfield c, note "Statement of responsibility — e.g., 'by Jane Smith'")
    nonfiling_chars  INTEGER (ind2,
      note "Number of characters to skip for sorting (includes trailing space)"
    )
  }

  record PUBLICATION (tag "264", ind2 "1",
    note "Production, publication, distribution — ind2=1 means publication"
  ) {
    place            STRING  (subfield a)
    publisher        STRING  (subfield b)
    date             STRING  (subfield c)
  }

  record PHYSICAL_DESC (tag "300") {
    extent           STRING  (subfield a, note "e.g., 'xi, 342 pages'")
    dimensions       STRING  (subfield c, note "e.g., '24 cm'")
  }

  list SUBJECTS (tag "650", repeatable, ind2 "0",
    note "Subject headings — ind2=0 means Library of Congress Subject Headings (LCSH)"
  ) {
    topical_term     STRING  (subfield a)
    general_subdiv   STRING  (subfield x)
    geographic_subdiv STRING (subfield z)
  }

  list ADDED_AUTHORS (tag "700", repeatable) {
    name             STRING  (subfield a)
    relator          STRING  (subfield e,
      note "Relationship to the work — e.g., 'editor', 'translator', 'illustrator'"
    )
  }
}
```

### Key patterns

- **Tag numbers as primary identifiers.** `tag "245"` is immediately recognisable to any cataloguer, with human-readable field names for everyone else.
- **Positional decoding for control fields.** Tag 008 uses `positions` metadata to decode a fixed-length string character by character.
- **Indicator semantics via metadata and notes.** `ind2 "1"` on the publication field, with `note` explaining what the indicator means.
- **Repeatable fields as lists.** ISBN, subjects, and added authors can repeat — `list` with `repeatable` captures this.
- **Domain vocabulary preserved.** Terms like "non-filing characters", "relator", and "topical term" are MARC terminology that cataloguers expect.
