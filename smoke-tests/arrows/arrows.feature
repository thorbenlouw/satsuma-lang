Feature: satsuma arrows, lineage, and field-lineage — end-to-end CLI behaviour
  The arrows command returns every mapping where a given field participates,
  from either the source side or target side.  Companion commands lineage and
  field-lineage provide schema-level and field-level traversal views.  These
  scenarios verify that all three commands agree on the same underlying graph.

  # ---------------------------------------------------------------------------
  # Case 01 — Simple direct arrow: s1.a -> s2.b, no transform
  # ---------------------------------------------------------------------------

  Scenario: Source field returns one outgoing arrow with classification "none"
    Given the Satsuma fixture "arrows/01-simple/fixture.stm"
    When I query arrows for "s1.a"
    Then I get 1 arrow
    And the arrow source is "::s1.a"
    And the arrow target is "::s2.b"
    And the classification is "none"
    And derived is false

  Scenario: Querying from the target side returns the same arrow
    Given the Satsuma fixture "arrows/01-simple/fixture.stm"
    When I query arrows for "s2.b"
    Then I get 1 arrow
    And the arrow source is "::s1.a"
    And the arrow target is "::s2.b"

  Scenario: --as-source on a target-only field exits with code 1
    Given the Satsuma fixture "arrows/01-simple/fixture.stm"
    When I query arrows for "s2.b" as source expecting exit code 1
    Then the command exits with code 1

  Scenario: --as-source on the actual source field returns only the outgoing arrow
    Given the Satsuma fixture "arrows/01-simple/fixture.stm"
    When I query arrows for "s1.a" as source
    Then I get 1 arrow
    And the arrow target is "::s2.b"

  Scenario: Arrows and schema lineage agree on the single-hop chain
    Given the Satsuma fixture "arrows/01-simple/fixture.stm"
    When I query arrows for "s1.a"
    Then the arrow source is "::s1.a"
    And the arrow target is "::s2.b"
    When I query lineage from "s1"
    Then the lineage schemas are exactly "s1, s2"
    And the lineage has edge "s1" to "m"
    And the lineage has edge "m" to "s2"
    When I query lineage to "s2"
    Then the lineage schemas are exactly "s1, s2"
    And the lineage has edge "s1" to "m"

  Scenario: Field lineage resolves upstream and downstream from both ends
    Given the Satsuma fixture "arrows/01-simple/fixture.stm"
    When I query field-lineage for "s1.a"
    Then the field identifier is "::s1.a"
    And upstream is empty
    And there is 1 downstream field
    And the downstream field is "::s2.b"
    And the downstream via-mapping is "::m"
    And the downstream classification is "none"
    When I query field-lineage for "s2.b"
    Then the field identifier is "::s2.b"
    And there is 1 upstream field
    And the upstream field is "::s1.a"
    And downstream is empty
    When I query field-lineage for "s2.b" upstream only
    Then there is 1 upstream field
    And downstream is empty
    When I query field-lineage for "s1.a" downstream only
    Then there is 1 downstream field
    And upstream is empty

  # ---------------------------------------------------------------------------
  # Case 02 — Both sides: s2.a is a target in m1 and a source in m2
  # ---------------------------------------------------------------------------

  Scenario: A passthrough field appears in two arrows — as target in one, source in another
    Given the Satsuma fixture "arrows/02-both-sides/fixture.stm"
    When I query arrows for "s2.a"
    Then I get 2 arrows
    And the arrows include a target "::s2.a"
    And the arrows include a target "::s3.a"

  Scenario: --as-source on a passthrough field returns only the outgoing arrow
    Given the Satsuma fixture "arrows/02-both-sides/fixture.stm"
    When I query arrows for "s2.a" as source
    Then I get 1 arrow
    And the arrow source is "::s2.a"
    And the arrow target is "::s3.a"

  Scenario: Arrows and schema lineage agree on the 3-schema passthrough chain
    Given the Satsuma fixture "arrows/02-both-sides/fixture.stm"
    When I query arrows for "s2.a"
    Then I get 2 arrows
    When I query lineage from "s2"
    Then the lineage includes schema "s3"
    And the lineage has edge "s2" to "m2"
    And the lineage has edge "m2" to "s3"
    When I query lineage to "s2"
    Then the lineage includes schema "s1"
    And the lineage has edge "s1" to "m1"
    And the lineage has edge "m1" to "s2"

  Scenario: Field lineage resolves both directions for a passthrough field
    Given the Satsuma fixture "arrows/02-both-sides/fixture.stm"
    When I query field-lineage for "s2.a"
    Then the field identifier is "::s2.a"
    And there is 1 upstream field
    And the upstream field is "::s1.a"
    And the upstream via-mapping is "::m1"
    And there is 1 downstream field
    And the downstream field is "::s3.a"
    And the downstream via-mapping is "::m2"

  # ---------------------------------------------------------------------------
  # Case 03 — Ten layers: source leaf, mid-chain node, target leaf
  # ---------------------------------------------------------------------------

  Scenario: Source leaf has exactly one outgoing arrow
    Given the Satsuma fixture "arrows/03-ten-layers/fixture.stm"
    When I query arrows for "s1.a"
    Then I get 1 arrow
    And the arrow source is "::s1.a"
    And the arrow target is "::s2.a"

  Scenario: Mid-chain field appears in two arrows — one incoming, one outgoing
    Given the Satsuma fixture "arrows/03-ten-layers/fixture.stm"
    When I query arrows for "s6.a"
    Then I get 2 arrows

  Scenario: Target leaf has one incoming arrow; --as-source exits with code 1
    Given the Satsuma fixture "arrows/03-ten-layers/fixture.stm"
    When I query arrows for "s11.a"
    Then I get 1 arrow
    And the arrow source is "::s10.a"
    And the arrow target is "::s11.a"
    When I query arrows for "s11.a" as source expecting exit code 1
    Then the command exits with code 1

  Scenario: Default depth 10 reaches all 11 schemas; depth 5 reaches exactly 6
    # --depth counts schema-to-schema hops.  A 10-schema chain has 10 hops,
    # so the default depth of 10 is sufficient to see all 11 schemas.
    Given the Satsuma fixture "arrows/03-ten-layers/fixture.stm"
    When I query arrows for "s6.a"
    Then I get 2 arrows
    And the arrows include a target "::s7.a"
    And the arrows include a source "::s6.a"
    When I query lineage from "s1"
    Then the lineage schemas are exactly "s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11"
    When I query lineage from "s1" with depth 5
    Then the lineage schemas are exactly "s1, s2, s3, s4, s5, s6"
    When I query lineage to "s11"
    Then the lineage includes schema "s1"
    And the lineage includes schema "s11"

  # ---------------------------------------------------------------------------
  # Case 04 — Multi-source: s1.a, s2.b -> s3.c
  # ---------------------------------------------------------------------------

  Scenario: Querying a multi-source arrow from the first source returns the combined source list
    Given the Satsuma fixture "arrows/04-multi-source/fixture.stm"
    When I query arrows for "s1.a"
    Then I get 1 arrow
    And the arrow target is "::s3.c"
    And the source list is "::s1.a, ::s2.b"

  Scenario: Querying a multi-source arrow from the second source returns the same combined list
    Given the Satsuma fixture "arrows/04-multi-source/fixture.stm"
    When I query arrows for "s2.b"
    Then I get 1 arrow
    And the arrow target is "::s3.c"
    And the source list is "::s1.a, ::s2.b"

  Scenario: Querying a multi-source arrow by target returns all attributed sources
    Given the Satsuma fixture "arrows/04-multi-source/fixture.stm"
    When I query arrows for "s3.c"
    Then I get 1 arrow
    And the arrow target is "::s3.c"
    And the source list is "::s1.a, ::s2.b"

  Scenario: Multi-source mapping — schema lineage shows both sources feeding the target
    # Schema-level lineage is correct even though field attribution is distributed
    # across all source fields via the combined source list.
    Given the Satsuma fixture "arrows/04-multi-source/fixture.stm"
    When I query lineage from "s1"
    Then the lineage includes schema "s3"
    And the lineage has edge "s1" to "m"
    When I query lineage from "s2"
    Then the lineage includes schema "s3"
    And the lineage has edge "s2" to "m"
    When I query lineage to "s3"
    Then the lineage schemas are exactly "s1, s2, s3"

  # ---------------------------------------------------------------------------
  # Case 05 — NL ref: -> z { "derive from @s1.a scaled by @s1.b" }
  # NL @ref mentions are implicit field lineage edges.  s1.a and s1.b appear
  # only inside the NL body via @ref — the CLI synthesises nl-derived arrows.
  # ---------------------------------------------------------------------------

  Scenario: NL derived target has no explicit source and classification "nl"
    Given the Satsuma fixture "arrows/05-nl-ref/fixture.stm"
    When I query arrows for "s2.z"
    Then I get 1 arrow
    And the arrow source is null
    And the arrow target is "::s2.z"
    And the classification is "nl"
    And derived is true

  Scenario: Fields referenced via @ref in an NL body produce nl-derived arrows
    Given the Satsuma fixture "arrows/05-nl-ref/fixture.stm"
    When I query arrows for "s1.a"
    Then I get 1 arrow
    And the classification is "nl-derived"
    And derived is true
    And the arrow target is "::s2.z"
    And the arrow mapping is "::m"
    When I query arrows for "s1.b"
    Then I get 1 arrow
    And the classification is "nl-derived"
    And derived is true
    And the arrow target is "::s2.z"

  Scenario: --as-source returns nl-derived arrows for @ref fields
    Given the Satsuma fixture "arrows/05-nl-ref/fixture.stm"
    When I query arrows for "s1.a" as source
    Then I get 1 arrow
    And the classification is "nl-derived"
    And the arrow source is "::s1.a"
    And the arrow target is "::s2.z"

  Scenario: NL mapping schema lineage agrees despite derived arrows
    Given the Satsuma fixture "arrows/05-nl-ref/fixture.stm"
    When I query arrows for "s2.z"
    Then the arrow mapping is "::m"
    When I query lineage from "s1"
    Then the lineage schemas are exactly "s1, s2"
    And the lineage has edge "s1" to "m"
    And the lineage has edge "m" to "s2"
    When I query lineage to "s2"
    Then the lineage includes schema "s1"

  Scenario: Field lineage on NL derived target traces both @ref upstream fields
    Given the Satsuma fixture "arrows/05-nl-ref/fixture.stm"
    When I query field-lineage for "s2.z"
    Then the field identifier is "::s2.z"
    And the upstream fields include "::s1.a"
    And the upstream fields include "::s1.b"
    And all upstream classifications are "nl-derived"
    When I query field-lineage for "s1.a"
    Then the field identifier is "::s1.a"
    And upstream is empty
    And the downstream fields include "::s2.z"

  # ---------------------------------------------------------------------------
  # Case 06a — Cross-namespace arrow (src::s1 -> tgt::s2)
  # ---------------------------------------------------------------------------

  Scenario: Cross-namespace target-side query reveals the fully qualified source field
    Given the Satsuma fixture "arrows/06-namespace/cross-ns.stm"
    When I query arrows for "tgt::s2.b"
    Then I get 1 arrow
    And the arrow source is "src::s1.a"
    And the arrow target is "tgt::s2.b"
    And the classification is "none"

  Scenario: Spread field from a global fragment is accessible via a cross-namespace target query
    Given the Satsuma fixture "arrows/06-namespace/cross-ns.stm"
    When I query arrows for "tgt::s2.id"
    Then I get 1 arrow
    And the arrow source is "src::s1.id"
    And the arrow target is "tgt::s2.id"

  Scenario: Cross-namespace source-side query returns arrows for a namespaced source field
    Given the Satsuma fixture "arrows/06-namespace/cross-ns.stm"
    When I query arrows for "src::s1.a"
    Then I get at least 1 arrow
    And at least one arrow source contains "src::s1"

  Scenario: Cross-namespace arrows and schema lineage agree on the topology
    Given the Satsuma fixture "arrows/06-namespace/cross-ns.stm"
    When I query arrows for "tgt::s2.b"
    Then at least one arrow source contains "src::s1"
    When I query lineage from "src::s1"
    Then the lineage includes schema "tgt::s2"
    And the lineage has edge "src::s1" to "m"
    And the lineage has edge "m" to "tgt::s2"
    When I query lineage to "tgt::s2"
    Then the lineage includes schema "src::s1"

  # ---------------------------------------------------------------------------
  # Case 06b — Implicit namespace ref: mapping inside `namespace ns` uses
  # unqualified schema names that resolve to ns::s1 and ns::s2.
  # ---------------------------------------------------------------------------

  Scenario: Qualified query ns::s1.a finds the arrow within its namespace
    Given the Satsuma fixture "arrows/06-namespace/implicit-ref.stm"
    When I query arrows for "ns::s1.a"
    Then I get 1 arrow
    And the arrow source is "ns::s1.a"
    And the arrow target is "ns::s2.b"
    And the arrow mapping is "ns::m"

  Scenario: Unqualified query s1.a resolves to the namespaced field
    Given the Satsuma fixture "arrows/06-namespace/implicit-ref.stm"
    When I query arrows for "s1.a"
    Then I get 1 arrow
    And the arrow source is "ns::s1.a"
    And the arrow target is "ns::s2.b"

  Scenario: Qualified and unqualified queries return identical results; lineage confirms namespace topology
    Given the Satsuma fixture "arrows/06-namespace/implicit-ref.stm"
    When I query arrows for "ns::s1.a"
    Then the arrow source is "ns::s1.a"
    And the arrow target is "ns::s2.b"
    When I query arrows for "s1.a"
    Then the arrow source is "ns::s1.a"
    And the arrow target is "ns::s2.b"
    When I query lineage from "ns::s1"
    Then the lineage schemas are exactly "ns::s1, ns::s2"
    And the lineage has edge "ns::s1" to "ns::m"
    And the lineage has edge "ns::m" to "ns::s2"
    When I query lineage to "ns::s2"
    Then the lineage includes schema "ns::s1"

  # ---------------------------------------------------------------------------
  # Case 07 — Record dots: nested field paths p.a -> q.a
  # ---------------------------------------------------------------------------

  Scenario: Dot-path source field in a record type resolves correctly
    Given the Satsuma fixture "arrows/07-record-dots/fixture.stm"
    When I query arrows for "s1.p.a"
    Then I get 1 arrow
    And the arrow source is "::s1.p.a"
    And the arrow target is "::s2.q.a"
    And the classification is "none"

  Scenario: Dot-path target field resolves to its own arrow
    Given the Satsuma fixture "arrows/07-record-dots/fixture.stm"
    When I query arrows for "s2.q.b"
    Then I get 1 arrow
    And the arrow source is "::s1.p.b"
    And the arrow target is "::s2.q.b"

  Scenario: The record container field has no direct arrow — exits with code 1
    Given the Satsuma fixture "arrows/07-record-dots/fixture.stm"
    When I query arrows for "s1.p" expecting exit code 1
    Then the command exits with code 1

  Scenario: Nested field arrows are consistent with schema-level lineage
    Given the Satsuma fixture "arrows/07-record-dots/fixture.stm"
    When I query arrows for "s1.p.a"
    Then the arrow target is "::s2.q.a"
    When I query arrows for "s1.p.b"
    Then the arrow target is "::s2.q.b"
    When I query lineage from "s1"
    Then the lineage schemas are exactly "s1, s2"
    And the lineage has edge "s1" to "m"
    And the lineage has edge "m" to "s2"
    When I query lineage to "s2"
    Then the lineage includes schema "s1"

  # ---------------------------------------------------------------------------
  # Case 08 — each block with .field relative paths
  # ---------------------------------------------------------------------------

  Scenario: each-block relative source path resolves to the absolute nested field path
    Given the Satsuma fixture "arrows/08-each-relative/fixture.stm"
    When I query arrows for "s1.items.name"
    Then I get 1 arrow
    And the arrow source is "::s1.items.name"
    And the arrow target is "::s2.rows.label"

  Scenario: each-block relative target path resolves to the absolute nested field path
    Given the Satsuma fixture "arrows/08-each-relative/fixture.stm"
    When I query arrows for "s2.rows.v"
    Then I get 1 arrow
    And the arrow source is "::s1.items.val"
    And the arrow target is "::s2.rows.v"

  Scenario: The each-block container field itself declares a list-to-list arrow
    Given the Satsuma fixture "arrows/08-each-relative/fixture.stm"
    When I query arrows for "s1.items"
    Then I get 1 arrow
    And the arrow source is "::s1.items"
    And the arrow target is "::s2.rows"

  Scenario: Container and leaf arrows share the same mapping; lineage confirms schema topology
    Given the Satsuma fixture "arrows/08-each-relative/fixture.stm"
    When I query arrows for "s1.items"
    Then the arrow mapping is "::m"
    When I query arrows for "s1.items.name"
    Then the arrow mapping is "::m"
    When I query lineage from "s1"
    Then the lineage schemas are exactly "s1, s2"
    And the lineage has edge "s1" to "m"
    And the lineage has edge "m" to "s2"
    When I query lineage to "s2"
    Then the lineage includes schema "s1"

  # ---------------------------------------------------------------------------
  # Case 09 — Spread: fragment spread fields are first-class schema members
  # ---------------------------------------------------------------------------

  Scenario: Spread fields from a fragment are visible to the arrows command
    Given the Satsuma fixture "arrows/09-spread/fixture.stm"
    When I query arrows for "s1.id"
    Then I get at least 1 arrow
    And at least one arrow source contains "s1.id"
    When I query arrows for "s1.code"
    Then I get at least 1 arrow

  Scenario: A field declared after a spread is a distinct schema member with its own arrow
    Given the Satsuma fixture "arrows/09-spread/fixture.stm"
    When I query arrows for "s1.extra"
    Then I get at least 1 arrow

  Scenario: Spread-based mapping produces correct schema-level lineage
    Given the Satsuma fixture "arrows/09-spread/fixture.stm"
    When I query lineage from "s1"
    Then the lineage schemas are exactly "s1, s2"
    And the lineage has edge "s1" to "m"
    And the lineage has edge "m" to "s2"
    When I query lineage to "s2"
    Then the lineage includes schema "s1"

  # ---------------------------------------------------------------------------
  # Case 10 — Transform classifications: nl, none (flatten), nl
  # ---------------------------------------------------------------------------

  Scenario: A pipe transform body produces classification "nl"
    Given the Satsuma fixture "arrows/10-pipe-flatten/fixture.stm"
    When I query arrows for "s1.a"
    Then I get 1 arrow
    And the classification is "nl"
    And the arrow source is "::s1.a"
    And the arrow target is "::s2.b"

  Scenario: A flatten operator with an empty body produces classification "none"
    Given the Satsuma fixture "arrows/10-pipe-flatten/fixture.stm"
    When I query arrows for "s1.items"
    Then I get 1 arrow
    And the classification is "none"
    And the arrow source is "::s1.items"
    And the arrow target is "::s2.flat"

  Scenario: An NL string body produces classification "nl"
    Given the Satsuma fixture "arrows/10-pipe-flatten/fixture.stm"
    When I query arrows for "s1.c"
    Then I get 1 arrow
    And the classification is "nl"
    And the arrow source is "::s1.c"
    And the arrow target is "::s2.d"

  Scenario: Querying by target field preserves the transform classification
    Given the Satsuma fixture "arrows/10-pipe-flatten/fixture.stm"
    When I query arrows for "s2.b"
    Then the classification is "nl"
    When I query arrows for "s2.flat"
    Then the classification is "none"
    When I query arrows for "s2.d"
    Then the classification is "nl"

  Scenario: All three transform classifications flow through the same mapping to the same schema
    Given the Satsuma fixture "arrows/10-pipe-flatten/fixture.stm"
    When I query arrows for "s1.a"
    Then the classification is "nl"
    And the arrow mapping is "::m"
    When I query arrows for "s1.items"
    Then the classification is "none"
    And the arrow mapping is "::m"
    When I query arrows for "s1.c"
    Then the classification is "nl"
    And the arrow mapping is "::m"
    When I query lineage from "s1"
    Then the lineage schemas are exactly "s1, s2"
    When I query lineage to "s2"
    Then the lineage includes schema "s1"
    And the lineage includes schema "s2"
