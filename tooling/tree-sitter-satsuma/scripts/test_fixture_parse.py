"""Pytest wrapper for tree-sitter fixture parsing tests.

Each fixture JSON in test/fixtures/ becomes a parametrized test case
(via conftest.py). The test delegates to test_fixtures.parse_fixture
which invokes the tree-sitter parser and checks the output.
"""

from __future__ import annotations

from test_fixtures import parse_fixture


def test_fixture_parses(fixture) -> None:
    """Each fixture must parse according to its expectations."""
    ok, message = parse_fixture(fixture)
    assert ok, message
