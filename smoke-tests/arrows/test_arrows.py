"""
Smoke tests for `satsuma arrows` and `satsuma lineage`.

Each case has:
  - Arrow tests: assert on the immediate arrows involving a field.
  - A combined lineage test: calls both `arrows` and `lineage` to cross-check
    that the field-level picture matches the schema-level topology.

JSON shape for arrows --json:
    {
      "mapping":        str,   # "ns::name" or "::name" for global mapping
      "source":         str,   # single qualified field ref, or comma-sep for multi-source
                               #   e.g. "::s1.a" or "::s1.a, ::s2.b"
      "target":         str,   # single qualified field ref, e.g. "::s2.b"
      "classification": str,   # "none" | "structural" | "nl" | "mixed" | "nl-derived"
      "transform_raw":  str,   # raw transform text
      "steps":          list,  # pipe step objects [{type, text}]
      "derived":        bool,
      "file":           str,   # absolute path
      "line":           int,
    }

JSON shape for lineage --json:
    {
      "nodes": [{"name": str, "type": str, "file": str}, ...],
      "edges": [{"src": str, "tgt": str}, ...],
    }
    Node names for global schemas use bare names ("s1"); namespaced schemas use
    qualified names ("ns::s1").

KNOWN BUGS documented inline — see tk tickets for each.
"""

import json
import os
import subprocess
from typing import Any

ARROWS_DIR = os.path.dirname(__file__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run_raw(cmd: str, fixture_rel: str, *, expect_exit: int = 0) -> Any:
    fixture = os.path.join(ARROWS_DIR, fixture_rel)
    full_cmd = ["satsuma"] + cmd.split() + ["--json", fixture]
    result = subprocess.run(full_cmd, capture_output=True, text=True)
    assert result.returncode == expect_exit, (
        f"Expected exit {expect_exit}, got {result.returncode}.\n"
        f"cmd:    {' '.join(full_cmd)}\n"
        f"stdout: {result.stdout}\n"
        f"stderr: {result.stderr}"
    )
    return json.loads(result.stdout) if result.returncode == 0 and result.stdout.strip() else None


def arrows_cmd(field: str, fixture_rel: str, *, as_source: bool = False, expect_exit: int = 0) -> list[dict]:
    """Run `satsuma arrows <field> [--as-source] --json <fixture>`."""
    flag = " --as-source" if as_source else ""
    result = _run_raw(f"arrows {field}{flag}", fixture_rel, expect_exit=expect_exit)
    return result if result is not None else []


def lineage_cmd(schema: str, fixture_rel: str, *, direction: str = "from", depth: int | None = None, expect_exit: int = 0) -> dict:
    """Run `satsuma lineage --<direction> <schema> [--depth N] --json <fixture>`."""
    depth_flag = f" --depth {depth}" if depth is not None else ""
    result = _run_raw(f"lineage --{direction} {schema}{depth_flag}", fixture_rel, expect_exit=expect_exit)
    return result if result is not None else {"nodes": [], "edges": []}


def schema_names(lin: dict) -> set[str]:
    """Set of schema node names from a lineage result."""
    return {n["name"] for n in lin["nodes"] if n["type"] == "schema"}


def lin_edges(lin: dict) -> set[tuple[str, str]]:
    """Set of (src, tgt) edge pairs from a lineage result."""
    return {(e["src"], e["tgt"]) for e in lin["edges"]}


# ---------------------------------------------------------------------------
# Case 01 — Simple direct arrow: a -> b, no transform
# ---------------------------------------------------------------------------

def test_01_source_side():
    """s1.a is the source of a bare arrow. One arrow, classification=none."""
    arrows = arrows_cmd("s1.a", "01-simple/fixture.stm")
    assert len(arrows) == 1
    a = arrows[0]
    assert a["source"] == "::s1.a"
    assert a["target"] == "::s2.b"
    assert a["classification"] == "none"
    assert a["derived"] is False


def test_01_target_side():
    """Querying from the target side returns the same arrow."""
    arrows = arrows_cmd("s2.b", "01-simple/fixture.stm")
    assert len(arrows) == 1
    assert arrows[0]["source"] == "::s1.a"
    assert arrows[0]["target"] == "::s2.b"


def test_01_as_source_on_target_field():
    """--as-source on a field that is only ever a target → exit 1."""
    arrows_cmd("s2.b", "01-simple/fixture.stm", as_source=True, expect_exit=1)


def test_01_as_source_on_source_field():
    """--as-source on the actual source field returns the outgoing arrow."""
    arrows = arrows_cmd("s1.a", "01-simple/fixture.stm", as_source=True)
    assert len(arrows) == 1
    assert arrows[0]["target"] == "::s2.b"


def test_01_lineage_combined():
    """
    Arrow says s1.a → s2.b.
    Lineage confirms: s1 → m → s2 forward; s1 ← m ← s2 in reverse.
    The two commands together give a complete field + schema picture.
    """
    arrow = arrows_cmd("s1.a", "01-simple/fixture.stm")[0]
    # Strip leading "::" and ".field" to get schema names
    src_schema = arrow["source"].lstrip(":").split(".")[0]   # "s1"
    tgt_schema = arrow["target"].lstrip(":").split(".")[0]   # "s2"

    lin_fwd = lineage_cmd(src_schema, "01-simple/fixture.stm", direction="from")
    lin_rev = lineage_cmd(tgt_schema, "01-simple/fixture.stm", direction="to")

    # Forward: s1 leads to s2 through one mapping
    assert schema_names(lin_fwd) == {"s1", "s2"}
    assert ("s1", "m") in lin_edges(lin_fwd)
    assert ("m", "s2") in lin_edges(lin_fwd)

    # Reverse: s2 traces back to s1
    assert schema_names(lin_rev) == {"s1", "s2"}
    assert ("s1", "m") in lin_edges(lin_rev)


# ---------------------------------------------------------------------------
# Case 02 — Both sides: field is target in one mapping, source in another
# ---------------------------------------------------------------------------

def test_02_middle_field_both_sides():
    """
    s2.a is the target of m1 and the source of m2.
    Both arrows appear when querying without --as-source.
    """
    arrows = arrows_cmd("s2.a", "02-both-sides/fixture.stm")
    assert len(arrows) == 2

    targets = {a["target"] for a in arrows}
    assert "::s2.a" in targets   # m1: s1.a → s2.a  (s2.a is the target)
    assert "::s3.a" in targets   # m2: s2.a → s3.a  (s2.a is the source)


def test_02_as_source_filters_to_one():
    """--as-source on s2.a returns only the outgoing arrow (s2.a → s3.a)."""
    arrows = arrows_cmd("s2.a", "02-both-sides/fixture.stm", as_source=True)
    assert len(arrows) == 1
    assert arrows[0]["source"] == "::s2.a"
    assert arrows[0]["target"] == "::s3.a"


def test_02_lineage_combined():
    """
    s2.a sits in the middle of s1→s2→s3.
    arrows(s2.a) reports two arrows; lineage corroborates the full chain.
    lineage --from s2 shows s2 feeds s3.
    lineage --to   s2 shows s2 receives from s1.
    """
    arrows = arrows_cmd("s2.a", "02-both-sides/fixture.stm")
    assert len(arrows) == 2

    lin_fwd = lineage_cmd("s2", "02-both-sides/fixture.stm", direction="from")
    lin_rev = lineage_cmd("s2", "02-both-sides/fixture.stm", direction="to")

    # Forward: s2 leads to s3
    assert "s3" in schema_names(lin_fwd)
    assert ("s2", "m2") in lin_edges(lin_fwd)
    assert ("m2", "s3") in lin_edges(lin_fwd)

    # Reverse: s2 receives from s1
    assert "s1" in schema_names(lin_rev)
    assert ("s1", "m1") in lin_edges(lin_rev)
    assert ("m1", "s2") in lin_edges(lin_rev)


# ---------------------------------------------------------------------------
# Case 03 — Ten layers: source leaf, middle node, target leaf
# ---------------------------------------------------------------------------

def test_03_source_leaf():
    """s1.a is the source leaf — exactly one outgoing arrow."""
    arrows = arrows_cmd("s1.a", "03-ten-layers/fixture.stm")
    assert len(arrows) == 1
    assert arrows[0]["source"] == "::s1.a"
    assert arrows[0]["target"] == "::s2.a"


def test_03_middle_node():
    """s6.a is both the target of m5 and the source of m6 — two arrows."""
    arrows = arrows_cmd("s6.a", "03-ten-layers/fixture.stm")
    assert len(arrows) == 2


def test_03_target_leaf():
    """
    s11.a is the target leaf — exactly one arrow; --as-source → exit 1.
    """
    arrows = arrows_cmd("s11.a", "03-ten-layers/fixture.stm")
    assert len(arrows) == 1
    assert arrows[0]["source"] == "::s10.a"
    assert arrows[0]["target"] == "::s11.a"

    arrows_cmd("s11.a", "03-ten-layers/fixture.stm", as_source=True, expect_exit=1)


def test_03_lineage_combined():
    """
    arrows(s6.a) gives the two hops around s6.
    lineage --from s1 with sufficient depth reaches all 11 schemas.

    NOTE: The default --depth 10 counts individual graph nodes (schema + mapping
    nodes), not schema-to-schema hops.  A 10-schema chain has 21 nodes total
    (11 schemas + 10 mappings), so reaching s11 from s1 requires --depth 20.
    With the default depth, lineage --from s1 stops at s6.
    """
    arrows = arrows_cmd("s6.a", "03-ten-layers/fixture.stm")
    assert len(arrows) == 2
    targets = {a["target"] for a in arrows}
    sources = {a["source"] for a in arrows}
    assert "::s7.a" in targets
    assert "::s6.a" in sources

    # Default depth stops midway — only reaches s6 (5 schema hops = 10 node steps)
    lin_default = lineage_cmd("s1", "03-ten-layers/fixture.stm", direction="from")
    assert schema_names(lin_default) == {f"s{i}" for i in range(1, 7)}

    # With explicit depth the full chain is visible
    lin_fwd = lineage_cmd("s1", "03-ten-layers/fixture.stm", direction="from", depth=20)
    lin_rev = lineage_cmd("s11", "03-ten-layers/fixture.stm", direction="to", depth=20)

    assert schema_names(lin_fwd) == {f"s{i}" for i in range(1, 12)}
    assert "s1" in schema_names(lin_rev)
    assert "s11" in schema_names(lin_rev)


# ---------------------------------------------------------------------------
# Case 04 — Multi-source: a, b -> c
#
# BUG: When querying arrows for a field in a multi-source arrow, the CLI
# attributes ALL source fields to the queried field's own schema.
# arrows(s1.a) → source="::s1.a, ::s1.b"  (b is in s2, not s1)
# arrows(s2.b) → source="::s2.a, ::s2.b"  (a is in s1, not s2)
# Correct behaviour: source should always be "::s1.a, ::s2.b".
# ---------------------------------------------------------------------------

def test_04_source_field():
    """
    Querying s1.a finds the multi-source arrow.
    BUG: second source field is incorrectly attributed to s1 (::s1.b not ::s2.b).
    """
    arrows = arrows_cmd("s1.a", "04-multi-source/fixture.stm")
    assert len(arrows) == 1
    a = arrows[0]
    assert a["target"] == "::s3.c"
    # Actual (buggy) attribution: both fields attributed to s1
    assert a["source"] == "::s1.a, ::s1.b"  # BUG: should be "::s1.a, ::s2.b"


def test_04_second_source_field():
    """
    Querying s2.b finds the same arrow but attribution is reversed.
    BUG: both fields are attributed to s2 (::s2.a not ::s1.a).
    """
    arrows = arrows_cmd("s2.b", "04-multi-source/fixture.stm")
    assert len(arrows) == 1
    a = arrows[0]
    assert a["target"] == "::s3.c"
    # Actual (buggy) attribution: both fields attributed to s2
    assert a["source"] == "::s2.a, ::s2.b"  # BUG: should be "::s1.a, ::s2.b"


def test_04_target():
    """Querying by target uses first source schema for all fields."""
    arrows = arrows_cmd("s3.c", "04-multi-source/fixture.stm")
    assert len(arrows) == 1
    assert arrows[0]["target"] == "::s3.c"
    assert arrows[0]["source"] == "::s1.a, ::s1.b"  # BUG: second should be ::s2.b


def test_04_lineage_combined():
    """
    Even though field attribution is wrong, schema-level lineage is correct.
    Both s1 and s2 appear as upstream of s3 in their respective lineage traces.
    """
    lin_from_s1 = lineage_cmd("s1", "04-multi-source/fixture.stm", direction="from")
    lin_from_s2 = lineage_cmd("s2", "04-multi-source/fixture.stm", direction="from")
    lin_to_s3   = lineage_cmd("s3", "04-multi-source/fixture.stm", direction="to")

    # s1 feeds m which feeds s3
    assert "s3" in schema_names(lin_from_s1)
    assert ("s1", "m") in lin_edges(lin_from_s1)

    # s2 also feeds the same m
    assert "s3" in schema_names(lin_from_s2)
    assert ("s2", "m") in lin_edges(lin_from_s2)

    # s3 traces back to both s1 and s2
    assert {"s1", "s2", "s3"} == schema_names(lin_to_s3)


# ---------------------------------------------------------------------------
# Case 05 — NL ref: -> z { "derive from @s1.a scaled by @s1.b" }
#
# The CLI does NOT synthesise nl-derived arrows when querying a field that
# appears only inside an NL body via @ref.  The derived=true flag lives on
# the explicitly declared "-> z {NL}" arrow itself.
# ---------------------------------------------------------------------------

def test_05_derived_target():
    """
    s2.z is a no-source derived target with an NL body.
    source is empty string; derived=True; classification="nl".
    """
    arrows = arrows_cmd("s2.z", "05-nl-ref/fixture.stm")
    assert len(arrows) == 1
    a = arrows[0]
    assert a["source"] == ""
    assert a["target"] == "::s2.z"
    assert a["classification"] == "nl"
    assert a["derived"] is True


def test_05_no_arrow_for_nl_referenced_field():
    """
    s1.a and s1.b appear only inside the NL body via @ref.
    The CLI does not surface nl-derived arrows for them — exit 1.
    """
    arrows_cmd("s1.a", "05-nl-ref/fixture.stm", expect_exit=1)
    arrows_cmd("s1.b", "05-nl-ref/fixture.stm", expect_exit=1)


def test_05_lineage_combined():
    """
    Schema-level: s1 → m → s2 (lineage works even when field-level arrows are absent).
    Cross-check: the arrow on s2.z is consistent with m being the bridge schema.
    """
    arrow = arrows_cmd("s2.z", "05-nl-ref/fixture.stm")[0]
    assert arrow["mapping"] == "::m"

    lin_fwd = lineage_cmd("s1", "05-nl-ref/fixture.stm", direction="from")
    lin_rev = lineage_cmd("s2", "05-nl-ref/fixture.stm", direction="to")

    # Even though @ref fields produce no arrows, schema-level lineage is intact
    assert {"s1", "s2"} == schema_names(lin_fwd)
    assert ("s1", "m") in lin_edges(lin_fwd)
    assert ("m", "s2") in lin_edges(lin_fwd)

    assert "s1" in schema_names(lin_rev)


# ---------------------------------------------------------------------------
# Case 06a — Cross-namespace arrow
#
# BUG: Querying by source field in a cross-namespace mapping fails.
# arrows(src::s1.a) → "Field 'a' not found in schema 'src::s1'" (exit 1).
# Querying by target side works correctly.
# ---------------------------------------------------------------------------

def test_06_cross_ns_target_side():
    """
    Querying by the target field works and reveals the namespaced source.
    """
    arrows = arrows_cmd("tgt::s2.b", "06-namespace/cross-ns.stm")
    assert len(arrows) == 1
    a = arrows[0]
    assert a["source"] == "src::s1.a"
    assert a["target"] == "tgt::s2.b"
    assert a["classification"] == "none"


def test_06_cross_ns_spread_field_via_target():
    """
    The spread field `id` (from global fragment gf) is accessible via the target.
    """
    arrows = arrows_cmd("tgt::s2.id", "06-namespace/cross-ns.stm")
    assert len(arrows) == 1
    assert arrows[0]["source"] == "src::s1.id"
    assert arrows[0]["target"] == "tgt::s2.id"


def test_06_cross_ns_source_side_fails():
    """
    BUG: Querying arrows by source field in a cross-namespace mapping → exit 1.
    The CLI cannot locate fields by schema when the schema is in a namespace
    and is referenced from a global-scope mapping.
    """
    arrows_cmd("src::s1.a", "06-namespace/cross-ns.stm", expect_exit=1)


def test_06_cross_ns_lineage_combined():
    """
    Target-side arrows give field detail; lineage gives schema topology.
    Cross-check: arrow source schema matches lineage upstream.
    """
    arrow = arrows_cmd("tgt::s2.b", "06-namespace/cross-ns.stm")[0]
    assert arrow["source"].startswith("src::s1")

    lin_fwd = lineage_cmd("src::s1", "06-namespace/cross-ns.stm", direction="from")
    lin_rev = lineage_cmd("tgt::s2", "06-namespace/cross-ns.stm", direction="to")

    assert "tgt::s2" in schema_names(lin_fwd)
    assert ("src::s1", "m") in lin_edges(lin_fwd)
    assert ("m", "tgt::s2") in lin_edges(lin_fwd)

    assert "src::s1" in schema_names(lin_rev)


# ---------------------------------------------------------------------------
# Case 06b — Implicit namespace ref
# Inside namespace ns the mapping uses unqualified schema names.
# Both ns::s1.a and s1.a resolve to the same arrow.
# ---------------------------------------------------------------------------

def test_06_implicit_ref_qualified():
    """Qualified query ns::s1.a finds the arrow."""
    arrows = arrows_cmd("ns::s1.a", "06-namespace/implicit-ref.stm")
    assert len(arrows) == 1
    a = arrows[0]
    assert a["source"] == "ns::s1.a"
    assert a["target"] == "ns::s2.b"
    assert a["mapping"] == "ns::m"


def test_06_implicit_ref_unqualified():
    """Unqualified query s1.a also finds the arrow (CLI resolves within namespace)."""
    arrows = arrows_cmd("s1.a", "06-namespace/implicit-ref.stm")
    assert len(arrows) == 1
    assert arrows[0]["source"] == "ns::s1.a"
    assert arrows[0]["target"] == "ns::s2.b"


def test_06_implicit_ref_lineage_combined():
    """
    Both qualified and unqualified arrow queries agree.
    Lineage confirms ns::s1 → ns::m → ns::s2.
    """
    a_qual   = arrows_cmd("ns::s1.a", "06-namespace/implicit-ref.stm")[0]
    a_unqual = arrows_cmd("s1.a", "06-namespace/implicit-ref.stm")[0]
    assert a_qual["source"]  == a_unqual["source"]
    assert a_qual["target"]  == a_unqual["target"]

    lin_fwd = lineage_cmd("ns::s1", "06-namespace/implicit-ref.stm", direction="from")
    lin_rev = lineage_cmd("ns::s2", "06-namespace/implicit-ref.stm", direction="to")

    assert schema_names(lin_fwd) == {"ns::s1", "ns::s2"}
    assert ("ns::s1", "ns::m") in lin_edges(lin_fwd)
    assert ("ns::m", "ns::s2") in lin_edges(lin_fwd)

    assert "ns::s1" in schema_names(lin_rev)


# ---------------------------------------------------------------------------
# Case 07 — Record dots: nested field paths p.a -> q.a
# ---------------------------------------------------------------------------

def test_07_nested_source_field():
    """Dot-path source field s1.p.a resolves correctly."""
    arrows = arrows_cmd("s1.p.a", "07-record-dots/fixture.stm")
    assert len(arrows) == 1
    a = arrows[0]
    assert a["source"] == "::s1.p.a"
    assert a["target"] == "::s2.q.a"
    assert a["classification"] == "none"


def test_07_nested_target_field():
    """Dot-path target field s2.q.b resolves to the second arrow."""
    arrows = arrows_cmd("s2.q.b", "07-record-dots/fixture.stm")
    assert len(arrows) == 1
    assert arrows[0]["source"] == "::s1.p.b"
    assert arrows[0]["target"] == "::s2.q.b"


def test_07_parent_record_field_has_no_arrow():
    """The record container s1.p has no arrow of its own → exit 1."""
    arrows_cmd("s1.p", "07-record-dots/fixture.stm", expect_exit=1)


def test_07_lineage_combined():
    """
    Nested field arrows give field detail; lineage confirms schema topology.
    The two dot-path arrows are consistent with s1 → m → s2.
    """
    a1 = arrows_cmd("s1.p.a", "07-record-dots/fixture.stm")[0]
    a2 = arrows_cmd("s1.p.b", "07-record-dots/fixture.stm")[0]

    assert a1["target"] == "::s2.q.a"
    assert a2["target"] == "::s2.q.b"

    lin = lineage_cmd("s1", "07-record-dots/fixture.stm", direction="from")
    assert schema_names(lin) == {"s1", "s2"}
    assert ("s1", "m") in lin_edges(lin)
    assert ("m", "s2") in lin_edges(lin)

    # Reverse
    lin_rev = lineage_cmd("s2", "07-record-dots/fixture.stm", direction="to")
    assert "s1" in schema_names(lin_rev)


# ---------------------------------------------------------------------------
# Case 08 — each block with .field relative paths
# ---------------------------------------------------------------------------

def test_08_relative_source_path():
    """.name resolves to s1.items.name → s2.rows.label."""
    arrows = arrows_cmd("s1.items.name", "08-each-relative/fixture.stm")
    assert len(arrows) == 1
    a = arrows[0]
    assert a["source"] == "::s1.items.name"
    assert a["target"] == "::s2.rows.label"


def test_08_relative_target_path():
    """.v resolves as a target — arrow comes from s1.items.val."""
    arrows = arrows_cmd("s2.rows.v", "08-each-relative/fixture.stm")
    assert len(arrows) == 1
    assert arrows[0]["source"] == "::s1.items.val"
    assert arrows[0]["target"] == "::s2.rows.v"


def test_08_list_container_has_arrow():
    """The each block itself declares items → rows at the container level."""
    arrows = arrows_cmd("s1.items", "08-each-relative/fixture.stm")
    assert len(arrows) == 1
    a = arrows[0]
    assert a["source"] == "::s1.items"
    assert a["target"] == "::s2.rows"


def test_08_lineage_combined():
    """
    Arrows at two levels (container and leaf) both contribute to s1 → s2.
    Lineage confirms schema topology; arrows give field granularity.
    """
    container = arrows_cmd("s1.items", "08-each-relative/fixture.stm")[0]
    leaf      = arrows_cmd("s1.items.name", "08-each-relative/fixture.stm")[0]

    # Container and leaf arrows are in the same mapping
    assert container["mapping"] == leaf["mapping"]

    lin = lineage_cmd("s1", "08-each-relative/fixture.stm", direction="from")
    assert schema_names(lin) == {"s1", "s2"}
    assert ("s1", "m") in lin_edges(lin)
    assert ("m", "s2") in lin_edges(lin)

    lin_rev = lineage_cmd("s2", "08-each-relative/fixture.stm", direction="to")
    assert "s1" in schema_names(lin_rev)


# ---------------------------------------------------------------------------
# Case 09 — Spread: fragment spread fields are NOT resolved for arrow lookup
#
# BUG: arrows(s1.id) where id comes from ...f → exit 1.
# The CLI does not expand fragment spreads when resolving field references.
# Inline fields declared directly in the schema body do resolve normally.
# ---------------------------------------------------------------------------

def test_09_spread_field_not_found():
    """
    BUG: Spread fields from ...f are invisible to the arrows command.
    s1.id and s1.code come from the fragment spread — exit 1 for both.
    """
    arrows_cmd("s1.id", "09-spread/fixture.stm", expect_exit=1)
    arrows_cmd("s1.code", "09-spread/fixture.stm", expect_exit=1)


def test_09_inline_field_after_spread_not_found():
    """
    BUG: The tree-sitter grammar consumes the field declaration that follows a
    spread as part of the spread's fragment name.

    `schema s1 { ...f\n  extra x }` is parsed as spreading a fragment called
    'f extra x' rather than spreading 'f' and then declaring field 'extra'.
    Consequently, `satsuma validate` reports "spreads undefined fragment 'f extra x'"
    and the CLI cannot find 'extra' as a field of s1 → exit 1.

    Correct behaviour: `...f` should spread fragment f; `extra x` should be a
    separate field declaration.
    """
    arrows_cmd("s1.extra", "09-spread/fixture.stm", expect_exit=1)


def test_09_lineage_combined():
    """
    Despite the spread parser bug, schema-level lineage is unaffected —
    the mapping still connects s1 to s2 at the schema level.
    """
    lin = lineage_cmd("s1", "09-spread/fixture.stm", direction="from")
    assert schema_names(lin) == {"s1", "s2"}
    assert ("s1", "m") in lin_edges(lin)
    assert ("m", "s2") in lin_edges(lin)

    lin_rev = lineage_cmd("s2", "09-spread/fixture.stm", direction="to")
    assert "s1" in schema_names(lin_rev)


# ---------------------------------------------------------------------------
# Case 10 — Transform classifications: structural, none (flatten), nl
# ---------------------------------------------------------------------------

def test_10_pipe_structural():
    """a -> b { trim | uppercase } → classification = "structural"."""
    arrows = arrows_cmd("s1.a", "10-pipe-flatten/fixture.stm")
    assert len(arrows) == 1
    assert arrows[0]["classification"] == "structural"
    assert arrows[0]["source"] == "::s1.a"
    assert arrows[0]["target"] == "::s2.b"


def test_10_flatten_none():
    """
    flatten items -> flat {} with empty body → classification = "none".
    The flatten operator alone, with no transform steps in the body,
    is treated as a bare arrow.
    """
    arrows = arrows_cmd("s1.items", "10-pipe-flatten/fixture.stm")
    assert len(arrows) == 1
    assert arrows[0]["classification"] == "none"
    assert arrows[0]["source"] == "::s1.items"
    assert arrows[0]["target"] == "::s2.flat"


def test_10_nl_transform():
    """c -> d { "NL body" } → classification = "nl"."""
    arrows = arrows_cmd("s1.c", "10-pipe-flatten/fixture.stm")
    assert len(arrows) == 1
    assert arrows[0]["classification"] == "nl"
    assert arrows[0]["source"] == "::s1.c"
    assert arrows[0]["target"] == "::s2.d"


def test_10_target_side_classifications():
    """Querying by target field preserves classification."""
    b_arrows = arrows_cmd("s2.b", "10-pipe-flatten/fixture.stm")
    f_arrows = arrows_cmd("s2.flat", "10-pipe-flatten/fixture.stm")
    d_arrows = arrows_cmd("s2.d", "10-pipe-flatten/fixture.stm")

    assert b_arrows[0]["classification"] == "structural"
    assert f_arrows[0]["classification"] == "none"
    assert d_arrows[0]["classification"] == "nl"


def test_10_lineage_combined():
    """
    Three arrows with different classifications all flow from s1 → m → s2.
    Lineage confirms the schema topology; arrows give the per-field detail.
    """
    all_arrows = [
        arrows_cmd("s1.a", "10-pipe-flatten/fixture.stm")[0],
        arrows_cmd("s1.items", "10-pipe-flatten/fixture.stm")[0],
        arrows_cmd("s1.c", "10-pipe-flatten/fixture.stm")[0],
    ]
    classifications = {a["classification"] for a in all_arrows}
    assert classifications == {"structural", "none", "nl"}

    # All arrows live in the same mapping
    mappings = {a["mapping"] for a in all_arrows}
    assert len(mappings) == 1

    lin = lineage_cmd("s1", "10-pipe-flatten/fixture.stm", direction="from")
    assert schema_names(lin) == {"s1", "s2"}

    lin_rev = lineage_cmd("s2", "10-pipe-flatten/fixture.stm", direction="to")
    assert "s1" in schema_names(lin_rev)
    assert "s2" in schema_names(lin_rev)
