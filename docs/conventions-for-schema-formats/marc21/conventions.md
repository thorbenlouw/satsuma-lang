# MARC21 Conventions

## Why This Format is Difficult

MARC21 (Machine-Readable Cataloguing) is the standard for bibliographic records in libraries worldwide. It has been in continuous use since the 1960s and remains the backbone of library catalogue systems. It is challenging because:

- **Tag/indicator/subfield model** — each field is identified by a 3-digit tag (e.g., `245` for title), has two single-character indicators, and contains subfields marked by delimiter codes (`$a`, `$b`, etc.)
- **Domain-specific semantics** — tag meanings are defined by cataloguing rules (RDA, AACR2) that assume deep domain knowledge
- **Indicator significance** — the two indicator positions modify field behaviour in non-obvious ways (e.g., `245` indicator 2 = number of non-filing characters to skip for sorting)
- **Repeatable vs non-repeatable** — some fields and subfields can repeat, others cannot, and the rules vary by tag
- **Fixed-length control fields** — tags 001-009 have positional data with character-by-character meaning (e.g., tag `008` positions 35-37 = language code)
- **Authority vs bibliographic** — the same tag numbers mean different things in authority records vs bibliographic records
- **ISBD punctuation** — field values include cataloguing punctuation baked into the data (e.g., `"New York :"`, `"Harper Lee."`) which downstream consumers must handle explicitly

MARC21 is unlike any other format in this collection. It is not a data interchange format in the enterprise sense — it is a cultural knowledge representation that predates modern schema concepts.

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `format` | Always `marc21` | `format marc21` |
| `record_type` | Bibliographic, authority, or holdings | `record_type bibliographic` |

Note: the schema-level `note` should state whether field values include ISBD punctuation (they usually do — e.g., `"New York :"`, `"Harper Lee."`). This matters for any downstream mapping or display logic.

### Field-level

| Token | Usage | Example |
|-------|-------|---------|
| `tag` | 3-digit MARC field tag (or `"LDR"` for the leader) | `tag "245"` |
| `ind1` | First indicator — as data field or as filter constraint | `ind1 "1"` |
| `ind2` | Second indicator — as data field or as filter constraint | `ind2 "0"` |
| `subfield` | Subfield code | `subfield a` |
| `positions` | Character positions for fixed fields | `positions "35-37"` |
| `repeatable` | Whether the field/subfield can repeat | `repeatable` |

### Indicator conventions

Indicators serve two different roles in MARC21, and Satsuma uses a convention to distinguish them:

- **Indicator as data** — the indicator value varies per record and carries information. Model it as a field inside the record with `(ind1)` or `(ind2)` metadata. Example: `245` indicator 2 (nonfiling character count) varies from 0 to 9 depending on the title.

- **Indicator as filter** — the indicator has a fixed value that selects which instance of a repeating field this record represents. Place the indicator on the `record` or `list_of record` declaration as a filter constraint. Example: `650` with `ind2 "0"` means "only LCSH subject headings."

When both indicators are fixed constraints, put them both on the record declaration. When one is data and one is a constraint, put the constraint on the record and the data indicator as a field inside it.

### Guidelines

- **Always model the Leader (LDR).** It carries record type, encoding level, and charset — omitting it makes the record ambiguous.
- Use `tag` on every field — MARC cataloguers think in tag numbers.
- Use human-readable names alongside tags (e.g., `TITLE` with `tag "245"`).
- Use `record` blocks for variable fields with subfield breakdowns.
- Use positional metadata for fixed-length control fields (tags 001-009, especially 008). Model every position you care about; list uncovered positions in a `note` so consumers know what is missing.
- Document indicator meanings in `note` — they are rarely self-explanatory.
- State ISBD punctuation handling at the schema level — consumers need to know whether to strip or preserve it.

## How Natural Language Helps

- **Indicator interpretation** — "245 indicator 2 = number of non-filing characters (e.g., 4 for 'The ' including the space)"
- **Cataloguing rule context** — "Under RDA, 264 replaces 260 for publication information; older records use 260"
- **Subfield relationships** — "In 700, subfield $e (relator term) qualifies the person in $a — e.g., 'editor', 'translator'"
- **Fixed-field decoding** — "Tag 008 positions 15-17 = place of publication code from MARC Code List for Countries"

## Example

```satsuma
// Satsuma v2 — MARC21 Bibliographic Record

schema marc21_bibliographic (format marc21, record_type bibliographic,
  note """
  Core bibliographic fields for a monograph record.

  **ISBD punctuation:** Field values include ISBD punctuation as stored
  in MARC (e.g., "New York :", "Harper Lee."). Downstream mappings
  should strip or preserve punctuation explicitly.
  """
) {
  // --- Leader (LDR) — 24-character fixed leader, present in every record ---

  LEADER record (tag "LDR",
    note "24-character fixed leader. Positions not modeled here: 00-04 (record length), 10 (indicator count), 11 (subfield code count), 12-16 (base address), 20-23 (entry map)."
  ) {
    record_status    STRING  (positions "05", enum {a, c, d, n, p},
      note "a=increase in encoding level, c=corrected, d=deleted, n=new, p=increase from prepublication"
    )
    record_type      STRING  (positions "06", enum {a, c, d, e, f, g, i, j, k, m, o, p, r, t},
      note "a=language material, t=manuscript, g=projected medium, etc."
    )
    encoding_level   STRING  (positions "17",
      note "Fullness of the record: blank=full, 3=abbreviated, 5=partial, 7=minimal, 8=prepublication"
    )
    charset          STRING  (positions "09", enum {" ", a},
      note "blank=MARC-8, a=UTF-8 (UCS/Unicode)"
    )
  }

  // --- Control fields (fixed-length, positional) ---

  CONTROL_NUMBER   STRING  (tag "001",
    note "Unique record identifier assigned by the cataloguing agency"
  )

  FIXED_DATA record (tag "008",
    note """
    40-character fixed-length data field. Each character position
    has a defined meaning. Positions modeled below are the most
    commonly used for books. Positions NOT modeled:
    - 11-14: date 2 (for multipart items)
    - 18-21: illustrations (up to 4 codes)
    - 22: target audience (blank=unknown, j=juvenile, etc.)
    - 23: form of item (blank=none, o=online, s=electronic, etc.)
    - 24-27: nature of contents (up to 4 codes)
    - 28: government publication
    - 29: conference publication (0=not conference, 1=conference)
    - 30: festschrift
    - 31: index
    - 33: literary form (0=not fiction, 1=fiction, etc.)
    - 34: biography (blank=no, a=autobiography, b=individual, etc.)
    - 38: modified record
    - 39: cataloguing source
    """
  ) {
    date_entered     STRING  (positions "00-05")
    date_type        STRING  (positions "06", enum {s, m, t, r, q, n},
      note "s=single known date, m=multiple dates, t=publication+copyright, r=reprint, q=questionable, n=unknown"
    )
    date_1           STRING  (positions "07-10")
    pub_country      STRING  (positions "15-17",
      note "MARC Code List for Countries — e.g., enk=England, xxu=United States"
    )
    language         STRING  (positions "35-37",
      note "MARC Code List for Languages — e.g., eng=English, fre=French"
    )
  }

  // --- Variable fields ---

  ISBN list_of record (tag "020", repeatable) {
    isbn             STRING  (subfield a)
    qualifying_info  STRING  (subfield q, note "e.g., hardback, paperback")
  }

  // TITLE: ind1 is data (added entry flag), ind2 is data (nonfiling count).
  // Both vary per record, so both are modeled as fields inside the record.
  TITLE record (tag "245") {
    title_proper     STRING  (subfield a, required)
    remainder        STRING  (subfield b, note "Subtitle or other title information")
    responsibility   STRING  (subfield c, note "Statement of responsibility — e.g., 'by Jane Smith'")
    added_entry      INTEGER (ind1, enum {0, 1},
      note "0=no added entry for title, 1=added entry for title"
    )
    nonfiling_chars  INTEGER (ind2,
      note "Number of characters to skip for sorting (includes trailing space). E.g., 4 for 'The '"
    )
  }

  // PUBLICATION: ind2 is a filter constraint (1=publication), not variable data.
  PUBLICATION record (tag "264", ind2 "1",
    note "Production, publication, distribution — ind2=1 selects publication instances only"
  ) {
    place            STRING  (subfield a)
    publisher        STRING  (subfield b)
    date             STRING  (subfield c)
  }

  PHYSICAL_DESC record (tag "300") {
    extent           STRING  (subfield a, note "e.g., 'xi, 342 pages'")
    dimensions       STRING  (subfield c, note "e.g., '24 cm'")
  }

  // SUBJECTS: ind2 is a filter constraint (0=LCSH), not variable data.
  SUBJECTS list_of record (tag "650", repeatable, ind2 "0",
    note "Subject headings — ind2=0 selects Library of Congress Subject Headings (LCSH) only. ind2=1 would select LC Children's, ind2=2 would select MeSH."
  ) {
    topical_term     STRING  (subfield a)
    general_subdiv   STRING  (subfield x)
    geographic_subdiv STRING (subfield z)
  }

  // ADDED_AUTHORS: ind1 is data (name type), varies per entry.
  ADDED_AUTHORS list_of record (tag "700", repeatable) {
    name_type        INTEGER (ind1, enum {0, 1, 3},
      note "0=forename (e.g., 'Prince'), 1=surname first (e.g., 'Smith, Jane'), 3=family name"
    )
    name             STRING  (subfield a)
    relator          STRING  (subfield e,
      note "Relationship to the work — e.g., 'editor', 'translator', 'illustrator'"
    )
  }
}
```

### Key patterns

- **Leader modeled explicitly.** The LDR carries record type, encoding level, and charset. Without it, a consumer cannot distinguish a monograph from a serial or determine whether the record is MARC-8 or UTF-8.
- **Tag numbers as primary identifiers.** `tag "245"` is immediately recognisable to any cataloguer, with human-readable field names for everyone else.
- **Positional decoding for control fields.** Tag 008 uses `positions` metadata to decode a fixed-length string character by character. Unmodeled positions are explicitly listed in the `note` so consumers know what is missing.
- **Indicator-as-data vs indicator-as-filter.** `245` ind1 and ind2 are data fields (they vary per record). `264` ind2 and `650` ind2 are filter constraints (they have a fixed value that selects which instances match). The convention is visible in the structure: data indicators are fields inside the record; filter indicators are metadata on the record declaration.
- **ISBD punctuation declared at schema level.** The `note` on the schema states that values include ISBD punctuation. Downstream mappings should handle this explicitly.
- **Repeatable fields as lists.** ISBN, subjects, and added authors can repeat — `list_of record` with `repeatable` captures this.
- **Domain vocabulary preserved.** Terms like "non-filing characters", "relator", and "topical term" are MARC terminology that cataloguers expect.
