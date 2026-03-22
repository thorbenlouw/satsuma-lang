# iCalendar Conventions

## Why This Format is Difficult

iCalendar (RFC 5545) is the universal standard for calendar data exchange — `.ics` files, CalDAV, meeting invitations. It is technically familiar but deceptively complex in practice:

- **Line folding** — long lines are wrapped by inserting CRLF + whitespace, requiring unfolding before parsing
- **Property parameters** — properties carry inline parameters with different syntax (e.g., `DTSTART;TZID=Europe/London:20260315T090000`)
- **Recurrence rules (RRULE)** — a compact DSL for expressing repeating events that encodes complex temporal logic in a single property value
- **Timezone handling** — timezone definitions are embedded inline (VTIMEZONE components) or referenced by TZID, with no guarantee of IANA identifier usage
- **Component nesting** — events (VEVENT), alarms (VALARM), and timezones (VTIMEZONE) nest within the calendar (VCALENDAR) with different property sets
- **Real-world variance** — Google Calendar, Outlook, and Apple Calendar each produce subtly different iCalendar output

iCalendar is a good "bridge" example: familiar enough that most readers have encountered `.ics` files, but complex enough to demonstrate Satsuma's value.

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `format` | Always `icalendar` | `format icalendar` |
| `component` | iCalendar component type | `component VEVENT` |

### Field-level

| Token | Usage | Example |
|-------|-------|---------|
| `property` | iCalendar property name | `property DTSTART` |
| `param` | Property parameter | `param TZID` |
| `value_type` | Value data type per RFC 5545 | `value_type DATE-TIME` |

### Guidelines

- Use `property` on every field — iCalendar properties are the canonical identifiers
- Use name-first `record` blocks for nested components (VALARM inside VEVENT, VTIMEZONE inside VCALENDAR)
- Document RRULE interpretation in `note` — recurrence rules are compact and easy to misread
- Note timezone handling explicitly — it is the most common source of bugs in calendar interop

## How Natural Language Helps

- **Recurrence interpretation** — "RRULE:FREQ=MONTHLY;BYDAY=2TU means the second Tuesday of every month"
- **Timezone resolution** — "If TZID is not an IANA identifier, fall back to the embedded VTIMEZONE offset rules"
- **Line folding** — "All property values must be unfolded before interpretation — continuation lines start with a single space or tab"
- **Cross-client quirks** — "Outlook sends DTSTART as floating (no TZID) for all-day events; Google sends DATE value type instead"

## Example

```stm
// Satsuma v2 — iCalendar Event (simplified)

schema icalendar_event (format icalendar, component VEVENT,
  note """
  Single calendar event from an iCalendar feed.
  Assumes line unfolding has been applied before parsing.
  """
) {
  UID              STRING  (property UID, required,
    note "Globally unique identifier — typically a UUID or URI"
  )

  SUMMARY          STRING  (property SUMMARY, required,
    note "Event title — plain text, may contain escaped commas and semicolons"
  )

  DESCRIPTION      STRING  (property DESCRIPTION,
    note "Event body — may contain escaped newlines (\\n) and basic formatting"
  )

  DTSTART          STRING  (property DTSTART, value_type DATE-TIME, required,
    note """
    Start date-time. Three possible forms:
    - With TZID parameter: `DTSTART;TZID=Europe/London:20260315T090000`
    - UTC: `DTSTART:20260315T090000Z`
    - Floating (no timezone): `DTSTART:20260315T090000`
    For all-day events, value type is DATE: `DTSTART;VALUE=DATE:20260315`
    """
  )

  DTEND            STRING  (property DTEND, value_type DATE-TIME,
    note "End date-time — same format rules as DTSTART. Mutually exclusive with DURATION."
  )

  DURATION         STRING  (property DURATION,
    note "ISO 8601 duration (e.g., PT1H30M). Used instead of DTEND for some recurring events."
  )

  LOCATION         STRING  (property LOCATION)

  STATUS           STRING  (property STATUS, enum {TENTATIVE, CONFIRMED, CANCELLED})

  RRULE            STRING  (property RRULE,
    note """
    Recurrence rule — compact DSL for repeating events. Examples:
    - `FREQ=WEEKLY;BYDAY=MO,WE,FR` — every Mon/Wed/Fri
    - `FREQ=MONTHLY;BYDAY=2TU` — second Tuesday of each month
    - `FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15` — every 15 March
    - `FREQ=DAILY;COUNT=10` — daily for 10 occurrences
    - `FREQ=WEEKLY;UNTIL=20261231T235959Z` — weekly until end of 2026
    """
  )

  EXDATE list_of record (property EXDATE,
    note "Exception dates — specific occurrences removed from a recurrence set"
  ) {
    date             STRING (value_type DATE-TIME)
  }

  ORGANIZER        STRING  (property ORGANIZER,
    note "mailto: URI of the event organiser — e.g., mailto:jane@example.com"
  )

  ATTENDEES list_of record (property ATTENDEE) {
    address          STRING (note "mailto: URI of the attendee")
    role             STRING (param ROLE, enum {CHAIR, REQ-PARTICIPANT, OPT-PARTICIPANT})
    partstat         STRING (param PARTSTAT,
      enum {NEEDS-ACTION, ACCEPTED, DECLINED, TENTATIVE}
    )
    rsvp             STRING (param RSVP, enum {TRUE, FALSE})
  }

  ALARM record (component VALARM,
    note "Nested alarm component — triggers a reminder before the event"
  ) {
    action           STRING (property ACTION, enum {DISPLAY, AUDIO, EMAIL})
    trigger          STRING (property TRIGGER,
      note "Duration before event start (e.g., -PT15M = 15 minutes before)"
    )
    description      STRING (property DESCRIPTION,
      note "Reminder text — required when ACTION=DISPLAY"
    )
  }
}
```

### Key patterns

- **Property names as identifiers.** `property DTSTART`, `property RRULE` match the RFC directly.
- **Parameters as metadata.** Attendee properties carry inline parameters (ROLE, PARTSTAT) expressed as `param` tokens.
- **RRULE documented via NL.** The recurrence rule DSL is explained with concrete examples in a `note` rather than decomposed into separate fields.
- **Nested components as records.** VALARM inside VEVENT maps to a name-first `record` block.
- **Variant representations acknowledged.** DTSTART documents all three possible forms (TZID, UTC, floating) and the all-day DATE alternative.
