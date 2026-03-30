Feature: satsuma lineage — schema-level graph traversal
  The lineage command traverses the mapping graph from a named schema
  and returns the reachable schemas and edges.  --from traces forward
  (downstream); --to traces backward (upstream).  --depth limits how
  many schema-to-schema hops to follow.

  The fixture used here (fixtures/simple.stm) models a branching pipeline:
    s1 → m1 → s2 → m2 → s3
    s1 → m3 → s3          (direct path bypassing s2)

  # ---------------------------------------------------------------------------
  # Forward traversal
  # ---------------------------------------------------------------------------

  Scenario: Forward lineage from s1 traverses both downstream paths in a branching graph
    # s1 feeds s2 via m1, and s3 directly via m3.
    # s2 then feeds s3 via m2.  All three schemas are reachable from s1.
    Given the Satsuma fixture "fixtures/simple.stm"
    When I query lineage from "s1"
    Then the lineage schemas are exactly "s1, s2, s3"
    And the lineage has edge "s1" to "m1"
    And the lineage has edge "m1" to "s2"
    And the lineage has edge "s2" to "m2"
    And the lineage has edge "m2" to "s3"
    And the lineage has edge "s1" to "m3"
    And the lineage has edge "m3" to "s3"

  Scenario: Forward lineage from a mid-chain schema includes only its downstream, not upstream
    # s2 feeds s3 via m2.  s1 is upstream of s2 and must not appear.
    Given the Satsuma fixture "fixtures/simple.stm"
    When I query lineage from "s2"
    Then the lineage schemas are exactly "s2, s3"
    And the lineage has edge "s2" to "m2"
    And the lineage has edge "m2" to "s3"
    And the lineage does not include schema "s1"

  # ---------------------------------------------------------------------------
  # Reverse traversal
  # ---------------------------------------------------------------------------

  Scenario: Reverse lineage to s3 shows all schemas that feed into it via two distinct paths
    # s3 is reachable from s1 via two routes: s1→m1→s2→m2→s3 and s1→m3→s3.
    # Reverse traversal from s3 must surface both paths and all three schemas.
    Given the Satsuma fixture "fixtures/simple.stm"
    When I query lineage to "s3"
    Then the lineage schemas are exactly "s1, s2, s3"
    And the lineage has edge "m2" to "s3"
    And the lineage has edge "m3" to "s3"
    And the lineage has edge "s1" to "m1"
    And the lineage has edge "s1" to "m3"

  # ---------------------------------------------------------------------------
  # Depth limiting
  # ---------------------------------------------------------------------------

  Scenario: Depth 1 from s1 reaches immediate neighbours only, not their descendants
    # Depth counts schema-to-schema hops.  s2 and s3 are both 1 hop from s1
    # (via m1 and m3 respectively), so all three schemas appear at depth 1.
    # No additional schemas exist beyond s3 in this fixture.
    Given the Satsuma fixture "fixtures/simple.stm"
    When I query lineage from "s2" with depth 1
    Then the lineage schemas are exactly "s2, s3"
    And the lineage has edge "s2" to "m2"
    And the lineage has edge "m2" to "s3"
